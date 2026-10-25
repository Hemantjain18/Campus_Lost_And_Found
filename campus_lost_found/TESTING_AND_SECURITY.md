# Security Audit & Testing Checklist

## Part 1: Comprehensive Security Review

### 1. File Upload Vulnerability Safeguards
- **Risk**: Attackers uploading PHP/executable web shells, SVG files with embedded `<script>` payloads, or directory traversal strings like `../../etc/passwd`.
- **Implementation**:
  - **Extension Whitelist**: Only `png`, `jpg`, `jpeg`, and `webp` extensions are permitted. Extensions like `.php`, `.py`, `.exe`, `.svg`, `.html`, or double extensions (`.php.jpg`) are rejected.
  - **UUID Filename Sanitization**: Original user filenames are discarded. Files are renamed using `uuid.uuid4().hex_{timestamp}.{ext}`, completely neutralizing path traversal attacks (`../`).
  - **Size Guard**: Flask's `MAX_CONTENT_LENGTH = 5 * 1024 * 1024` rejects files over 5MB before server memory is saturated.
  - **Isolated Storage**: Files are served from `static/uploads/` where web servers (Nginx/Apache) disable script execution (`fastcgi_pass` / `php` disabled for that folder).

### 2. SQL Injection Prevention
- **Risk**: Injections through search inputs, filter parameters, or category IDs.
- **Implementation**:
  - All database queries strictly use **parameterized statements** with `%s` placeholders. String concatenation (`f"WHERE name = '{input}'"`) is prohibited throughout `app.py`.
  - Type-casting on IDs (`int(item_id)`, `int(category_id)`) guarantees numeric inputs.

### 3. Cross-Site Scripting (XSS) Prevention
- **Risk**: Stored XSS in item descriptions, titles, or claim messages being rendered to other users or administrators.
- **Implementation**:
  - In `app.js`, all user-supplied data is passed through an `escapeHtml()` utility before being inserted into innerHTML, converting `<`, `>`, `&`, and `"` into HTML character entities.
  - Form inputs are bounded with `minlength` and `maxlength`.

### 4. Authentication, Authorization & Session Security
- **Risk**: Privilege escalation, unauthorized deletion of other users' posts, session hijacking.
- **Implementation**:
  - **Password Hashing**: Stored with Werkzeug's modern Scrypt/PBKDF2 algorithms with unique per-user salts.
  - **Role-Based Guards**: Backend decorator `@admin_required` independently validates the server-side session role for all admin routes, ensuring frontend tampering cannot bypass permissions.
  - **Ownership Check**: `PUT /api/items/<id>` and `DELETE /api/items/<id>` verify `item['user_id'] == session['user_id']` unless the user is an admin.
  - **Cookie Hardening**: `SESSION_COOKIE_HTTPONLY = True` prevents client scripts from stealing session cookies; `SESSION_COOKIE_SAMESITE = 'Lax'` prevents cross-site request forgery (CSRF).

### 5. Proper Error Codes & Graceful Empty States
- Missing fields return `400 Bad Request`.
- Unauthenticated requests return `401 Unauthorized`.
- Non-admin access to admin routes returns `403 Forbidden`.
- Non-existent items return `404 Not Found`.
- Duplicate email registrations or duplicate claims return `409 Conflict`.
- All views render human-friendly empty states when queries return 0 items.

---

## Part 2: QA Testing Checklist

| # | Test Scenario | Expected Outcome | Status |
|---|---|---|---|
| **1** | **User Registration** with valid email & 8+ char password | Returns 201 Created; auto-signs in user; session cookie issued | Pass |
| **2** | **Duplicate Email Registration** | Returns 409 Conflict with friendly error message | Pass |
| **3** | **Student Sign-in** with correct credentials | Returns 200 OK; redirects to browse view; displays student name in header | Pass |
| **4** | **Sign-in with wrong password** | Returns 401 Unauthorized; displays clean error toast | Pass |
| **5** | **Post Lost Item** with photo (< 5MB) | Item created with 201 Created; photo stored with UUID; redirects to detail | Pass |
| **6** | **Upload oversized file (> 5MB)** | Client validation catches file before upload; server returns 400 | Pass |
| **7** | **Upload forbidden extension (.exe or .php)** | Server rejects with 400 "Invalid image format" | Pass |
| **8** | **Browse Filtering by Type (Lost/Found)** | Only displays items matching chosen filter | Pass |
| **9** | **Browse Search by Keyword & Building** | Parameterized query filters records accurately | Pass |
| **10** | **Item Detail View** | Shows unboxed metadata, location, and description | Pass |
| **11** | **Smart Matching Engine** | Calculates match score based on Category + Keyword + Date proximity | Pass |
| **12** | **Submit Claim as Student** | Stores claim in database with status 'pending' | Pass |
| **13** | **Prevent Claiming Own Item** | Rejects with 400 "Cannot claim your own listing" | Pass |
| **14** | **Prevent Duplicate Pending Claim** | Rejects second claim attempt with 409 Conflict | Pass |
| **15** | **Student accesses /api/admin/metrics** | Blocked with 403 Forbidden | Pass |
| **16** | **Admin signs in** | Admin Portal link appears; displays KPIs, Category Chart, and Claims Queue | Pass |
| **17** | **Admin Approves Claim** | Claim status updates to 'approved'; item status updates to 'claimed'/'resolved' | Pass |
| **18** | **Owner Deletes Item** | Item and associated uploaded image removed from disk and database | Pass |
| **19** | **Non-owner attempts item deletion** | Blocked with 403 Forbidden | Pass |
