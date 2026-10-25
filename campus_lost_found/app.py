"""
Campus Lost and Found Portal - Flask REST API Backend
Stack: Python 3.10+, Flask, PyMySQL, Werkzeug, Flask-Session
Database: MySQL 8.0+
"""

import os
import re
import uuid
import math
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = os.getenv("SECRET_KEY", "campus_lost_found_dev_secret_key_32chars!")

# Session & Security Configuration
app.config["SESSION_TYPE"] = os.getenv("SESSION_TYPE", "filesystem")
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False  # Set to True in production HTTPS

# File Upload Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
CORS(app, supports_credentials=True)


# -----------------------------------------------------------------------------
# Database Helper
# -----------------------------------------------------------------------------
def get_db_connection():
    """Create and return a thread-safe MySQL connection using DictCursor."""
    return pymysql.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "lostfound_user"),
        password=os.getenv("DB_PASSWORD", "your_secure_mysql_password"),
        database=os.getenv("DB_NAME", "campus_lost_found"),
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=False
    )


# -----------------------------------------------------------------------------
# Auth Middleware Decorators
# -----------------------------------------------------------------------------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Unauthorized. Please log in to continue."}), 401
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Unauthorized. Please log in to continue."}), 401
        if session.get("role") != "admin":
            return jsonify({"error": "Forbidden. Campus security or admin privileges required."}), 403
        return f(*args, **kwargs)
    return decorated_function


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def tokenize_text(text):
    """Normalize and extract clean alphanumeric keywords for matching."""
    if not text:
        return set()
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    stop_words = {
        "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with",
        "is", "it", "this", "that", "was", "my", "i", "found", "lost", "near", "left",
        "has", "have", "some", "by", "from", "inside", "room", "floor"
    }
    tokens = set(cleaned.split()) - stop_words
    return {t for t in tokens if len(t) > 2}


# -----------------------------------------------------------------------------
# Smart Matching Engine
# -----------------------------------------------------------------------------
def compute_match_score(target_item, candidate_item):
    """
    Computes a match score (0 to 100) between a target item and candidate item.
    Scoring breakdown:
    - Category match: 40 points
    - Keyword token overlap (Jaccard similarity): up to 40 points
    - Date proximity (decay over 21 days): up to 20 points
    """
    score = 0
    breakdown = {
        "category_points": 0,
        "keyword_points": 0,
        "date_points": 0,
        "matched_keywords": []
    }

    # 1. Category check
    if target_item.get("category_id") == candidate_item.get("category_id"):
        score += 40
        breakdown["category_points"] = 40

    # 2. Keyword overlap
    target_tokens = tokenize_text(f"{target_item.get('title', '')} {target_item.get('description', '')}")
    cand_tokens = tokenize_text(f"{candidate_item.get('title', '')} {candidate_item.get('description', '')}")
    common_tokens = target_tokens.intersection(cand_tokens)

    if target_tokens and cand_tokens:
        overlap_ratio = len(common_tokens) / math.sqrt(len(target_tokens) * len(cand_tokens))
        kw_pts = round(min(40, overlap_ratio * 55))
        score += kw_pts
        breakdown["keyword_points"] = kw_pts
        breakdown["matched_keywords"] = sorted(list(common_tokens))[:6]

    # 3. Date proximity
    try:
        t_date = target_item.get("date_occurred")
        c_date = candidate_item.get("date_occurred")
        if isinstance(t_date, str):
            t_date = datetime.strptime(t_date, "%Y-%m-%d").date()
        if isinstance(c_date, str):
            c_date = datetime.strptime(c_date, "%Y-%m-%d").date()

        if t_date and c_date:
            days_diff = abs((t_date - c_date).days)
            if days_diff <= 3:
                date_pts = 20
            elif days_diff <= 7:
                date_pts = 15
            elif days_diff <= 14:
                date_pts = 10
            elif days_diff <= 21:
                date_pts = 5
            else:
                date_pts = 0
            score += date_pts
            breakdown["date_points"] = date_pts
    except Exception:
        pass

    final_score = min(100, score)
    return final_score, breakdown


# -----------------------------------------------------------------------------
# Authentication Routes
# -----------------------------------------------------------------------------
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    phone = (data.get("phone") or "").strip()
    campus_id = (data.get("campus_id") or "").strip()

    if not full_name or not email or not password:
        return jsonify({"error": "Full name, email, and password are required."}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long."}), 400

    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"error": "Invalid email format."}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                return jsonify({"error": "An account with this email already exists."}), 409

            pwd_hash = generate_password_hash(password)
            cur.execute("""
                INSERT INTO users (full_name, email, password_hash, role, phone, campus_id)
                VALUES (%s, %s, %s, 'student', %s, %s)
            """, (full_name, email, pwd_hash, phone or None, campus_id or None))
            new_id = cur.lastrowid
            conn.commit()

            session["user_id"] = new_id
            session["role"] = "student"
            session["name"] = full_name
            session["email"] = email

            return jsonify({
                "message": "Registration successful.",
                "user": {
                    "id": new_id,
                    "full_name": full_name,
                    "email": email,
                    "role": "student"
                }
            }), 21
    finally:
        conn.close()


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, full_name, email, password_hash, role FROM users WHERE email = %s", (email,))
            user = cur.fetchone()

            if not user or not check_password_hash(user["password_hash"], password):
                return jsonify({"error": "Invalid email or password."}), 401

            session["user_id"] = user["id"]
            session["role"] = user["role"]
            session["name"] = user["full_name"]
            session["email"] = user["email"]

            return jsonify({
                "message": "Login successful.",
                "user": {
                    "id": user["id"],
                    "full_name": user["full_name"],
                    "email": user["email"],
                    "role": user["role"]
                }
            }), 200
    finally:
        conn.close()


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Successfully logged out."}), 200


@app.route("/api/auth/me", methods=["GET"])
def get_current_user():
    if "user_id" not in session:
        return jsonify({"authenticated": False, "user": None}), 200

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, full_name, email, role, phone, campus_id, created_at FROM users WHERE id = %s", (session["user_id"],))
            user = cur.fetchone()
            if not user:
                session.clear()
                return jsonify({"authenticated": False, "user": None}), 200
            return jsonify({"authenticated": True, "user": user}), 200
    finally:
        conn.close()


# -----------------------------------------------------------------------------
# Categories
# -----------------------------------------------------------------------------
@app.route("/api/categories", methods=["GET"])
def get_categories():
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, slug, description FROM categories ORDER BY id ASC")
            categories = cur.fetchall()
            return jsonify(categories), 200
    finally:
        conn.close()


# -----------------------------------------------------------------------------
# Items Management Routes
# -----------------------------------------------------------------------------
@app.route("/api/items", methods=["POST"])
@login_required
def create_item():
    """Create a new lost or found report with validated image upload."""
    title = (request.form.get("title") or "").strip()
    description = (request.form.get("description") or "").strip()
    item_type = (request.form.get("type") or "").strip().lower()
    category_id = request.form.get("category_id")
    location = (request.form.get("location") or "").strip()
    specific_location = (request.form.get("specific_location") or "").strip()
    date_occurred = (request.form.get("date_occurred") or "").strip()
    contact_email = (request.form.get("contact_email") or session.get("email", "")).strip()
    contact_phone = (request.form.get("contact_phone") or "").strip()

    if not title or not description or not item_type or not category_id or not location or not date_occurred:
        return jsonify({"error": "Missing required fields (title, description, type, category, location, date)."}), 400

    if item_type not in ("lost", "found"):
        return jsonify({"error": "Item type must be 'lost' or 'found'."}), 400

    try:
        category_id = int(category_id)
    except ValueError:
        return jsonify({"error": "Invalid category ID."}), 400

    # Handle image upload if present
    image_rel_path = None
    if "photo" in request.files:
        file = request.files["photo"]
        if file and file.filename != "":
            if not allowed_file(file.filename):
                return jsonify({"error": "Invalid image format. Allowed: PNG, JPG, JPEG, WEBP."}), 400

            file.seek(0, os.SEEK_END)
            size = file.tell()
            file.seek(0)
            if size > MAX_CONTENT_LENGTH:
                return jsonify({"error": "Image size exceeds 5MB limit."}), 400

            ext = file.filename.rsplit(".", 1)[1].lower()
            safe_name = f"{uuid.uuid4().hex}_{int(datetime.utcnow().timestamp())}.{ext}"
            file_path = os.path.join(app.config["UPLOAD_FOLDER"], safe_name)
            file.save(file_path)
            image_rel_path = f"uploads/{safe_name}"

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO items (
                    user_id, category_id, type, title, description,
                    location, specific_location, date_occurred, image_path,
                    contact_email, contact_phone, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'open')
            """, (
                session["user_id"], category_id, item_type, title, description,
                location, specific_location or None, date_occurred, image_rel_path,
                contact_email, contact_phone or None
            ))
            new_item_id = cur.lastrowid
            conn.commit()

            # Retrieve inserted item
            cur.execute("""
                SELECT i.*, c.name as category_name
                FROM items i
                JOIN categories c ON i.category_id = c.id
                WHERE i.id = %s
            """, (new_item_id,))
            created_item = cur.fetchone()

            return jsonify({
                "message": "Item report successfully submitted.",
                "item": created_item
            }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()


@app.route("/api/items", methods=["GET"])
def list_items():
    """
    Search and filter items with parameterized query:
    params: type, category_id, location, start_date, end_date, keyword, status, limit, offset
    """
    item_type = request.args.get("type")
    category_id = request.args.get("category_id")
    location = request.args.get("location")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    keyword = request.args.get("keyword")
    status = request.args.get("status")

    try:
        limit = min(int(request.args.get("limit", 20)), 100)
        offset = max(int(request.args.get("offset", 0)), 0)
    except ValueError:
        limit, offset = 20, 0

    where_clauses = ["1=1"]
    params = []

    if item_type in ("lost", "found"):
        where_clauses.append("i.type = %s")
        params.append(item_type)

    if category_id:
        try:
            where_clauses.append("i.category_id = %s")
            params.append(int(category_id))
        except ValueError:
            pass

    if location:
        where_clauses.append("i.location LIKE %s")
        params.append(f"%{location}%")

    if start_date:
        where_clauses.append("i.date_occurred >= %s")
        params.append(start_date)

    if end_date:
        where_clauses.append("i.date_occurred <= %s")
        params.append(end_date)

    if status in ("open", "claimed", "resolved"):
        where_clauses.append("i.status = %s")
        params.append(status)

    if keyword:
        where_clauses.append("(i.title LIKE %s OR i.description LIKE %s OR i.location LIKE %s)")
        kw_like = f"%{keyword}%"
        params.extend([kw_like, kw_like, kw_like])

    where_sql = " AND ".join(where_clauses)

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Get total matching count
            count_query = f"SELECT COUNT(*) as total FROM items i WHERE {where_sql}"
            cur.execute(count_query, params)
            total = cur.fetchone()["total"]

            # Fetch items with joins
            select_query = f"""
                SELECT i.id, i.user_id, i.category_id, i.type, i.title, i.description,
                       i.location, i.specific_location, i.date_occurred, i.image_path,
                       i.contact_email, i.contact_phone, i.status, i.created_at,
                       c.name AS category_name, c.slug AS category_slug,
                       u.full_name AS reporter_name
                FROM items i
                JOIN categories c ON i.category_id = c.id
                JOIN users u ON i.user_id = u.id
                WHERE {where_sql}
                ORDER BY i.date_occurred DESC, i.created_at DESC
                LIMIT %s OFFSET %s
            """
            cur.execute(select_query, params + [limit, offset])
            items = cur.fetchall()

            return jsonify({
                "items": items,
                "total": total,
                "limit": limit,
                "offset": offset
            }), 200
    finally:
        conn.close()


@app.route("/api/items/<int:item_id>", methods=["GET"])
def get_item_detail(item_id):
    """Retrieve full item details and compute possible match suggestions."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT i.*, c.name as category_name, c.slug as category_slug,
                       u.full_name as reporter_name
                FROM items i
                JOIN categories c ON i.category_id = c.id
                JOIN users u ON i.user_id = u.id
                WHERE i.id = %s
            """, (item_id,))
            item = cur.fetchone()

            if not item:
                return jsonify({"error": "Item not found."}), 404

            # Candidate items for smart matching (opposite type, active/open)
            opposite_type = "lost" if item["type"] == "found" else "found"
            cur.execute("""
                SELECT i.id, i.category_id, i.type, i.title, i.description,
                       i.location, i.date_occurred, i.image_path, i.status,
                       c.name as category_name
                FROM items i
                JOIN categories c ON i.category_id = c.id
                WHERE i.type = %s AND i.id != %s AND i.status = 'open'
                ORDER BY i.date_occurred DESC
                LIMIT 30
            """, (opposite_type, item_id))
            candidates = cur.fetchall()

            matches = []
            for candidate in candidates:
                score, breakdown = compute_match_score(item, candidate)
                if score >= 35:  # Relevance threshold
                    matches.append({
                        "item": candidate,
                        "match_score": score,
                        "breakdown": breakdown
                    })

            # Sort highest match score first
            matches.sort(key=lambda x: x["match_score"], reverse=True)

            return jsonify({
                "item": item,
                "suggested_matches": matches[:5]
            }), 200
    finally:
        conn.close()


@app.route("/api/items/<int:item_id>", methods=["PUT"])
@login_required
def update_item(item_id):
    """Update item details (owner or admin only)."""
    data = request.get_json() or {}
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id FROM items WHERE id = %s", (item_id,))
            item = cur.fetchone()
            if not item:
                return jsonify({"error": "Item not found."}), 404

            # Check permissions
            if item["user_id"] != session["user_id"] and session.get("role") != "admin":
                return jsonify({"error": "Forbidden. You can only update your own posts."}), 403

            allowed_fields = ["title", "description", "location", "specific_location", "status", "contact_phone"]
            updates = []
            values = []

            for field in allowed_fields:
                if field in data:
                    updates.append(f"{field} = %s")
                    values.append(data[field])

            if not updates:
                return jsonify({"error": "No valid fields provided for update."}), 400

            values.append(item_id)
            update_sql = f"UPDATE items SET {', '.join(updates)} WHERE id = %s"
            cur.execute(update_sql, values)
            conn.commit()

            return jsonify({"message": "Item updated successfully."}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/items/<int:item_id>", methods=["DELETE"])
@login_required
def delete_item(item_id):
    """Delete item (owner or admin only)."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, image_path FROM items WHERE id = %s", (item_id,))
            item = cur.fetchone()
            if not item:
                return jsonify({"error": "Item not found."}), 404

            if item["user_id"] != session["user_id"] and session.get("role") != "admin":
                return jsonify({"error": "Forbidden. You can only delete your own posts."}), 403

            # Delete associated image file from disk if present
            if item.get("image_path"):
                full_img_path = os.path.join(app.root_path, "static", item["image_path"])
                if os.path.exists(full_img_path):
                    try:
                        os.remove(full_img_path)
                    except OSError:
                        pass

            cur.execute("DELETE FROM items WHERE id = %s", (item_id,))
            conn.commit()

            return jsonify({"message": "Item successfully deleted."}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# -----------------------------------------------------------------------------
# Claims Submission
# -----------------------------------------------------------------------------
@app.route("/api/items/<int:item_id>/claim", methods=["POST"])
@login_required
def submit_claim(item_id):
    """Submit a verified claim or report of ownership for an item."""
    data = request.get_json() or {}
    message = (data.get("message") or "").strip()
    proof_details = (data.get("proof_details") or "").strip()

    if not message:
        return jsonify({"error": "A message explaining your claim is required."}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, user_id, status FROM items WHERE id = %s", (item_id,))
            item = cur.fetchone()
            if not item:
                return jsonify({"error": "Item not found."}), 404

            if item["user_id"] == session["user_id"]:
                return jsonify({"error": "You cannot submit a claim on your own listing."}), 400

            # Prevent duplicate pending claims from the same student
            cur.execute("""
                SELECT id FROM claims
                WHERE item_id = %s AND claimer_id = %s AND status = 'pending'
            """, (item_id, session["user_id"]))
            if cur.fetchone():
                return jsonify({"error": "You already have a pending claim for this item."}), 409

            cur.execute("""
                INSERT INTO claims (item_id, claimer_id, message, proof_details, status)
                VALUES (%s, %s, %s, %s, 'pending')
            """, (item_id, session["user_id"], message, proof_details or None))
            conn.commit()

            return jsonify({"message": "Claim submitted successfully. Campus staff will review it."}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/my-posts", methods=["GET"])
@login_required
def get_user_posts():
    """Retrieve posts created by the logged-in user, along with any received claims."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT i.*, c.name as category_name,
                       (SELECT COUNT(*) FROM claims cl WHERE cl.item_id = i.id) as claim_count
                FROM items i
                JOIN categories c ON i.category_id = c.id
                WHERE i.user_id = %s
                ORDER BY i.created_at DESC
            """, (session["user_id"],))
            items = cur.fetchall()

            # Also fetch claims submitted by this user
            cur.execute("""
                SELECT cl.*, i.title as item_title, i.type as item_type, i.location as item_location
                FROM claims cl
                JOIN items i ON cl.item_id = i.id
                WHERE cl.claimer_id = %s
                ORDER BY cl.created_at DESC
            """, (session["user_id"],))
            claims = cur.fetchall()

            return jsonify({"items": items, "claims": claims}), 200
    finally:
        conn.close()


# -----------------------------------------------------------------------------
# Admin Dashboard Endpoints (Admin role only)
# -----------------------------------------------------------------------------
@app.route("/api/admin/metrics", methods=["GET"])
@admin_required
def get_admin_metrics():
    """Returns lost vs found vs resolved counts, pending claims, and category chart data."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    SUM(CASE WHEN type = 'lost' AND status = 'open' THEN 1 ELSE 0 END) AS open_lost,
                    SUM(CASE WHEN type = 'found' AND status = 'open' THEN 1 ELSE 0 END) AS open_found,
                    SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) AS claimed_items,
                    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved_items,
                    COUNT(*) AS total_items
                FROM items
            """)
            counts = cur.fetchone()

            cur.execute("SELECT COUNT(*) as pending_claims FROM claims WHERE status = 'pending'")
            pending = cur.fetchone()["pending_claims"]

            # Category distribution for chart
            cur.execute("""
                SELECT c.name as category_name, COUNT(i.id) as item_count
                FROM categories c
                LEFT JOIN items i ON c.id = i.category_id
                GROUP BY c.id, c.name
                ORDER BY item_count DESC
            """)
            category_distribution = cur.fetchall()

            return jsonify({
                "counts": {
                    "open_lost": counts["open_lost"] or 0,
                    "open_found": counts["open_found"] or 0,
                    "claimed": counts["claimed_items"] or 0,
                    "resolved": counts["resolved_items"] or 0,
                    "total": counts["total_items"] or 0,
                    "pending_claims": pending
                },
                "category_distribution": category_distribution
            }), 200
    finally:
        conn.close()


@app.route("/api/admin/claims", methods=["GET"])
@admin_required
def list_admin_claims():
    """Retrieve all claims with item info and claimer profiles."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT cl.id, cl.item_id, cl.claimer_id, cl.message, cl.proof_details,
                       cl.status as claim_status, cl.admin_notes, cl.created_at,
                       i.title as item_title, i.type as item_type, i.status as item_status,
                       u.full_name as claimer_name, u.email as claimer_email, u.campus_id as claimer_campus_id
                FROM claims cl
                JOIN items i ON cl.item_id = i.id
                JOIN users u ON cl.claimer_id = u.id
                ORDER BY (cl.status = 'pending') DESC, cl.created_at DESC
            """)
            claims = cur.fetchall()
            return jsonify(claims), 200
    finally:
        conn.close()


@app.route("/api/admin/claims/<int:claim_id>", methods=["PUT"])
@admin_required
def review_claim(claim_id):
    """Approve or reject a claim and optionally update item resolution."""
    data = request.get_json() or {}
    new_status = data.get("status")
    admin_notes = data.get("admin_notes", "").strip()

    if new_status not in ("approved", "rejected", "pending"):
        return jsonify({"error": "Status must be 'approved', 'rejected', or 'pending'."}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, item_id FROM claims WHERE id = %s", (claim_id,))
            claim = cur.fetchone()
            if not claim:
                return jsonify({"error": "Claim not found."}), 404

            cur.execute("""
                UPDATE claims
                SET status = %s, admin_notes = %s, updated_at = NOW()
                WHERE id = %s
            """, (new_status, admin_notes or None, claim_id))

            # If claim is approved, optionally transition item status to 'claimed' or 'resolved'
            if new_status == "approved" and data.get("resolve_item"):
                cur.execute("UPDATE items SET status = 'resolved' WHERE id = %s", (claim["item_id"],))
            elif new_status == "approved":
                cur.execute("UPDATE items SET status = 'claimed' WHERE id = %s", (claim["item_id"],))

            conn.commit()
            return jsonify({"message": f"Claim status updated to {new_status}."}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/admin/items/<int:item_id>/status", methods=["PUT"])
@admin_required
def set_item_status(item_id):
    """Direct status change by admin (e.g., mark resolved)."""
    data = request.get_json() or {}
    new_status = data.get("status")

    if new_status not in ("open", "claimed", "resolved"):
        return jsonify({"error": "Status must be 'open', 'claimed', or 'resolved'."}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE items SET status = %s WHERE id = %s", (new_status, item_id))
            if cur.rowcount == 0:
                return jsonify({"error": "Item not found."}), 404
            conn.commit()
            return jsonify({"message": f"Item marked as {new_status}."}), 200
    finally:
        conn.close()


if __name__ == "__main__":
    # Run development server
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
