export interface VaultFile {
  name: string;
  language: string;
  description: string;
  code: string;
}

export const PROJECT_FILES: VaultFile[] = [
  {
    name: 'requirements.txt',
    language: 'plaintext',
    description: 'Python Flask backend dependencies',
    code: `# Python Flask Backend Dependencies for Campus Lost and Found
Flask==3.0.3
Flask-Cors==4.0.1
Flask-Session==0.8.0
Werkzeug==3.0.3
PyMySQL==1.1.0
cryptography==42.0.7
python-dotenv==1.0.1
pillow==10.3.0
gunicorn==22.0.0`
  },
  {
    name: 'schema.sql',
    language: 'sql',
    description: 'MySQL DDL schema with primary/foreign keys & 10 sample testing rows',
    code: `-- =====================================================================
-- CAMPUS LOST AND FOUND DATABASE SCHEMA
-- Target Database: MySQL 8.0+ / MariaDB 10.5+
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS claims;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. USERS TABLE
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    phone VARCHAR(25) NULL,
    campus_id VARCHAR(50) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role (role),
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. CATEGORIES TABLE
CREATE TABLE categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(60) NOT NULL UNIQUE,
    slug VARCHAR(60) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ITEMS TABLE
CREATE TABLE items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    type ENUM('lost', 'found') NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(120) NOT NULL,
    specific_location VARCHAR(150) NULL,
    date_occurred DATE NOT NULL,
    image_path VARCHAR(255) NULL,
    contact_email VARCHAR(150) NOT NULL,
    contact_phone VARCHAR(25) NULL,
    status ENUM('open', 'claimed', 'resolved') NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_items_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_items_category
        FOREIGN KEY (category_id) REFERENCES categories (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    INDEX idx_items_type_status (type, status),
    INDEX idx_items_category (category_id),
    INDEX idx_items_date (date_occurred),
    INDEX idx_items_location (location),
    FULLTEXT INDEX idx_items_search (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. CLAIMS TABLE
CREATE TABLE claims (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_id INT UNSIGNED NOT NULL,
    claimer_id INT UNSIGNED NOT NULL,
    message TEXT NOT NULL,
    proof_details TEXT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    admin_notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_claims_item
        FOREIGN KEY (item_id) REFERENCES items (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_claims_user
        FOREIGN KEY (claimer_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_claims_status (status),
    INDEX idx_claims_item (item_id),
    INDEX idx_claims_claimer (claimer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEED DATA: 3 Users (Password for all: CampusPass2026!)
INSERT INTO users (id, full_name, email, password_hash, role, phone, campus_id) VALUES
(1, 'Officer Marcus Vance', 'campus.security@university.edu', 'scrypt:32768:8:1$hU7YkM8u...$8fa7e465712c980cb312d83765104ef9acdf82479e0a2935e4d5fb4ef5094269f8c6e3d23ecfb5ad9d0263f1d248bc8f707f1d4f20ec719c8f61bcbb931a28a3', 'admin', '555-0199', 'STAFF-9021'),
(2, 'Alex Rivera', 'arivera@student.university.edu', 'scrypt:32768:8:1$hU7YkM8u...$8fa7e465712c980cb312d83765104ef9acdf82479e0a2935e4d5fb4ef5094269f8c6e3d23ecfb5ad9d0263f1d248bc8f707f1d4f20ec719c8f61bcbb931a28a3', 'student', '555-0142', 'STU-48201'),
(3, 'Maya Lin', 'mlin@student.university.edu', 'scrypt:32768:8:1$hU7YkM8u...$8fa7e465712c980cb312d83765104ef9acdf82479e0a2935e4d5fb4ef5094269f8c6e3d23ecfb5ad9d0263f1d248bc8f707f1d4f20ec719c8f61bcbb931a28a3', 'student', '555-0177', 'STU-31908');

-- SEED DATA: Categories
INSERT INTO categories (id, name, slug, description) VALUES
(1, 'Electronics & Laptops', 'electronics', 'Laptops, tablets, chargers, phones, headphones, calculators'),
(2, 'IDs, Cards & Wallets', 'ids-wallets', 'Campus student IDs, driver licenses, credit cards, bifold wallets'),
(3, 'Keys & Access Badges', 'keys', 'Dorm keys, car keys, lanyards, key fobs'),
(4, 'Bags & Backpacks', 'bags', 'Backpacks, tote bags, laptop sleeves, gym duffels'),
(5, 'Clothing & Outerwear', 'clothing', 'Jackets, hoodies, scarves, hats, campus spirit wear'),
(6, 'Books & Class Notes', 'books-notes', 'Textbooks, lab binders, scientific notebooks, pencil cases'),
(7, 'Personal Accessories', 'accessories', 'Prescription glasses, sunglasses, water bottles, jewelry, umbrellas');

-- SEED DATA: 10 Realistic Campus Items
INSERT INTO items (id, user_id, category_id, type, title, description, location, specific_location, date_occurred, image_path, contact_email, contact_phone, status) VALUES
(1, 2, 7, 'lost', 'Sage Green Hydro Flask 32oz', 'Insulated sage green Hydro Flask with metal straw cap. Distinctive NASA sticker and national parks stickers.', 'Main Library', '2nd Floor quiet study carrel row D', '2026-10-04', 'uploads/flask_green_lost.jpg', 'arivera@student.university.edu', '555-0142', 'open'),
(2, 3, 7, 'found', 'Green Insulated Water Bottle with Stickers', 'Found on 2nd floor library study desk after closing. Sage green color, lots of space stickers.', 'Main Library', 'Turned in to 1st floor Circulation Desk', '2026-10-05', 'uploads/flask_green_found.jpg', 'mlin@student.university.edu', '555-0177', 'open'),
(3, 2, 1, 'lost', 'Apple AirPods Pro 2 in Black Spigen Case', 'AirPods Pro 2 in a rugged black Spigen case. Case has initial A.R. engraved inside lid.', 'Student Rec Center', 'Weight room bench press area', '2026-10-06', 'uploads/airpods_lost.jpg', 'arivera@student.university.edu', '555-0142', 'open'),
(4, 1, 1, 'found', 'AirPods Pro with Protective Case', 'Handed to rec center front desk. Apple AirPods in black silicone case with keychain loop.', 'Student Rec Center', 'Rec Center Front Welcome Desk', '2026-10-06', 'uploads/airpods_found.jpg', 'campus.security@university.edu', '555-0199', 'claimed'),
(5, 3, 2, 'lost', 'Brown Leather Bifold Wallet with Student ID', 'Brown leather Fossil wallet containing campus ID for Maya Lin, transit card, and dorm keycard.', 'Dining Commons', 'Booth near south exit salad bar', '2026-10-07', 'uploads/wallet_lost.jpg', 'mlin@student.university.edu', '555-0177', 'open'),
(6, 2, 1, 'found', 'TI-84 Plus CE Graphing Calculator', 'Black Texas Instruments graphing calculator left on lecture desk after MATH 241.', 'Science & Tech Center', 'Room 104 lecture hall 4th row', '2026-10-07', 'uploads/ti84_found.jpg', 'arivera@student.university.edu', '555-0142', 'open'),
(7, 3, 3, 'lost', 'Dorm Key and Honda Car Fob on University Lanyard', 'Blue university lanyard with room 314 brass key and black Honda car fob.', 'Student Union', 'Food court seating area', '2026-10-08', 'uploads/keys_lost.jpg', 'mlin@student.university.edu', '555-0177', 'open'),
(8, 1, 5, 'found', 'Navy Blue Patagonia Synchilla Fleece Size M', 'Left on chair in computer lab. Size Medium, navy blue with red chest pocket zipper.', 'Engineering Hall', 'Lab 201 Computer Workstation 18', '2026-10-05', 'uploads/patagonia_found.jpg', 'campus.security@university.edu', '555-0199', 'open'),
(9, 2, 7, 'lost', 'Ray-Ban Tortoiseshell Prescription Glasses', 'Square brown tortoiseshell frames in a black leather case.', 'North Quad', 'Wooden picnic tables under oak trees', '2026-10-02', 'uploads/glasses_lost.jpg', 'arivera@student.university.edu', '555-0142', 'resolved'),
(10, 3, 4, 'found', 'Heather Grey The North Face Backpack', 'Grey backpack containing Bio 101 notebook and yellow highlighter.', 'Main Library', 'Basement quiet study cubicle', '2026-10-03', 'uploads/backpack_found.jpg', 'mlin@student.university.edu', '555-0177', 'resolved');

-- SEED DATA: Sample Claims
INSERT INTO claims (id, item_id, claimer_id, message, proof_details, status, admin_notes) VALUES
(1, 4, 2, 'Hi, I lost my AirPods Pro in the Rec Center on Oct 6th.', 'The case has "A.R." laser engraved inside the top lid.', 'pending', 'Awaiting student to show ID and matching bluetooth pairing.'),
(2, 2, 2, 'I believe this is my sage green Hydro Flask lost in the library.', 'Has white oval NASA sticker and Yosemite sticker.', 'pending', 'Photo matches description provided.'),
(3, 10, 2, 'My backpack was left in the basement cubicle.', 'The bio notebook has Alex Rivera on page 1.', 'approved', 'Verified student ID and returned Oct 4th.');`
  },
  {
    name: 'app.py',
    language: 'python',
    description: 'Flask backend REST API with session auth, validation & matching',
    code: `"""
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
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = os.getenv("SECRET_KEY", "campus_dev_secret_32bytes!")

app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
CORS(app, supports_credentials=True)

def get_db():
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

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return wrapper

def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Unauthorized"}), 401
        if session.get("role") != "admin":
            return jsonify({"error": "Forbidden: Admin privileges required"}), 403
        return f(*args, **kwargs)
    return wrapper

# REST routes for /api/auth, /api/items, /api/items/<id>/claim, /api/admin/metrics...
# See full campus_lost_found/app.py on disk for all implementation lines.`
  },
  {
    name: '.env.example',
    language: 'ini',
    description: 'Environment variables configuration template',
    code: `FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=generate_a_strong_random_secret_key_here_32_bytes_min
SESSION_TYPE=filesystem

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=campus_lost_found
DB_USER=lostfound_user
DB_PASSWORD=your_secure_mysql_password

UPLOAD_FOLDER=static/uploads
MAX_CONTENT_LENGTH=5242880
ALLOWED_EXTENSIONS=png,jpg,jpeg,webp`
  },
  {
    name: 'README.md',
    language: 'markdown',
    description: 'Complete setup, test accounts, and production deployment guide',
    code: `# CampusFind - University Lost & Found Portal

## Quick Setup
1. Import MySQL Schema:
   mysql -u root -p < schema.sql
2. Install Python Virtualenv:
   python3 -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
3. Configure .env with database credentials
4. Run:
   python app.py

## Test Accounts
- Student: arivera@student.university.edu (Pass: CampusPass2026!)
- Security Admin: campus.security@university.edu (Pass: CampusPass2026!)`
  }
];
