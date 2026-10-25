-- =====================================================================
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

-- ---------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores campus accounts (students, staff, campus security / admins)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- Canonical taxonomy for lost & found cataloging
-- ---------------------------------------------------------------------
CREATE TABLE categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(60) NOT NULL UNIQUE,
    slug VARCHAR(60) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. ITEMS TABLE
-- Core repository of lost and found listings
-- ---------------------------------------------------------------------
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
        ON DELETE CASCADE
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_items_category
        FOREIGN KEY (category_id) REFERENCES categories (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_items_type_status (type, status),
    INDEX idx_items_category (category_id),
    INDEX idx_items_date (date_occurred),
    INDEX idx_items_location (location),
    FULLTEXT INDEX idx_items_search (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. CLAIMS TABLE
-- Ownership claims submitted by students on found items
-- ---------------------------------------------------------------------
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
        ON DELETE CASCADE
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_claims_user
        FOREIGN KEY (claimer_id) REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    INDEX idx_claims_status (status),
    INDEX idx_claims_item (item_id),
    INDEX idx_claims_claimer (claimer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- SEED DATA: 3 Users (1 Admin, 2 Students)
-- Passwords hashed using standard Werkzeug pbkdf2:sha256:
-- Plaintext for all 3 demo accounts: "CampusPass2026!"
-- =====================================================================

INSERT INTO users (id, full_name, email, password_hash, role, phone, campus_id) VALUES
(1, 'Officer Marcus Vance', 'campus.security@university.edu', 'scrypt:32768:8:1$hU7YkM8u...$8fa7e465712c980cb312d83765104ef9acdf82479e0a2935e4d5fb4ef5094269f8c6e3d23ecfb5ad9d0263f1d248bc8f707f1d4f20ec719c8f61bcbb931a28a3', 'admin', '555-0199', 'STAFF-9021'),
(2, 'Alex Rivera', 'arivera@student.university.edu', 'scrypt:32768:8:1$hU7YkM8u...$8fa7e465712c980cb312d83765104ef9acdf82479e0a2935e4d5fb4ef5094269f8c6e3d23ecfb5ad9d0263f1d248bc8f707f1d4f20ec719c8f61bcbb931a28a3', 'student', '555-0142', 'STU-48201'),
(3, 'Maya Lin', 'mlin@student.university.edu', 'scrypt:32768:8:1$hU7YkM8u...$8fa7e465712c980cb312d83765104ef9acdf82479e0a2935e4d5fb4ef5094269f8c6e3d23ecfb5ad9d0263f1d248bc8f707f1d4f20ec719c8f61bcbb931a28a3', 'student', '555-0177', 'STU-31908');

-- =====================================================================
-- SEED DATA: Categories
-- =====================================================================

INSERT INTO categories (id, name, slug, description) VALUES
(1, 'Electronics & Laptops', 'electronics', 'Laptops, tablets, chargers, phones, headphones, calculators'),
(2, 'IDs, Cards & Wallets', 'ids-wallets', 'Campus student IDs, driver licenses, credit cards, bifold wallets'),
(3, 'Keys & Access Badges', 'keys', 'Dorm keys, car keys, lanyards, key fobs'),
(4, 'Bags & Backpacks', 'bags', 'Backpacks, tote bags, laptop sleeves, gym duffels'),
(5, 'Clothing & Outerwear', 'clothing', 'Jackets, hoodies, scarves, hats, campus spirit wear'),
(6, 'Books & Class Notes', 'books-notes', 'Textbooks, lab binders, scientific notebooks, pencil cases'),
(7, 'Personal Accessories', 'accessories', 'Prescription glasses, sunglasses, water bottles, jewelry, umbrellas');

-- =====================================================================
-- SEED DATA: 10 Realistic Sample Items (5 Lost, 5 Found)
-- Covering realistic campus buildings, matching pairs, and statuses
-- =====================================================================

INSERT INTO items (id, user_id, category_id, type, title, description, location, specific_location, date_occurred, image_path, contact_email, contact_phone, status) VALUES
-- Item 1: LOST Hydro Flask
(1, 2, 7, 'lost', 'Sage Green Hydro Flask 32oz', 'Insulated sage green Hydro Flask with metal straw cap. Distinctive NASA sticker and national parks stickers. Small dent near base.', 'Main Library', '2nd Floor quiet study carrel row D', '2026-10-04', 'uploads/flask_green_lost.jpg', 'arivera@student.university.edu', '555-0142', 'open'),

-- Item 2: FOUND Hydro Flask (Potential Match with Item 1!)
(2, 3, 7, 'found', 'Green Insulated Water Bottle with Stickers', 'Found on 2nd floor library study desk after closing. Sage green color, lots of space and outdoors stickers, metal handle lid.', 'Main Library', 'Turned in to 1st floor Circulation Desk', '2026-10-05', 'uploads/flask_green_found.jpg', 'mlin@student.university.edu', '555-0177', 'open'),

-- Item 3: LOST AirPods Pro
(3, 2, 1, 'lost', 'Apple AirPods Pro 2 in Black Spigen Case', 'AirPods Pro 2 in a rugged black Spigen case with small carabiner clip. Case has initial "A.R." engraved inside lid.', 'Student Rec Center', 'Weight room bench press area or locker room 1B', '2026-10-06', 'uploads/airpods_lost.jpg', 'arivera@student.university.edu', '555-0142', 'open'),

-- Item 4: FOUND Wireless Earbuds (Potential Match with Item 3!)
(4, 1, 1, 'found', 'AirPods Pro with Protective Case', 'Handed to rec center front desk. Apple AirPods in a black silicone case with keychain loop. Serial matches university registry.', 'Student Rec Center', 'Rec Center Front Welcome Desk', '2026-10-06', 'uploads/airpods_found.jpg', 'campus.security@university.edu', '555-0199', 'claimed'),

-- Item 5: LOST Student ID & Leather Wallet
(5, 3, 2, 'lost', 'Brown Leather Bifold Wallet with Student ID', 'Brown leather Fossil wallet containing campus ID card for Maya Lin, transit card, and dorm keycard. No cash inside.', 'Dining Commons', 'Booth near south exit salad bar', '2026-10-07', 'uploads/wallet_lost.jpg', 'mlin@student.university.edu', '555-0177', 'open'),

-- Item 6: FOUND Graphing Calculator TI-84
(6, 2, 1, 'found', 'TI-84 Plus CE Graphing Calculator', 'Black Texas Instruments graphing calculator left on lecture desk after MATH 241. Battery cover has formula tape.', 'Science & Tech Center', 'Room 104 lecture hall 4th row', '2026-10-07', 'uploads/ti84_found.jpg', 'arivera@student.university.edu', '555-0142', 'open'),

-- Item 7: LOST Keyring on Blue University Lanyard
(7, 3, 3, 'lost', 'Dorm Key and Honda Car Fob on University Lanyard', 'Blue university lanyard with room 314 brass key, black Honda car fob, and a mini flashlight keychain.', 'Student Union', 'Food court seating area or Starbucks lounge', '2026-10-08', 'uploads/keys_lost.jpg', 'mlin@student.university.edu', '555-0177', 'open'),

-- Item 8: FOUND Navy Patagonia Fleece Jacket
(8, 1, 5, 'found', 'Navy Blue Patagonia Synchilla Fleece Size M', 'Left on chair in computer lab. Size Medium, navy blue with red chest pocket zipper. Clean condition.', 'Engineering Hall', 'Lab 201 Computer Workstation 18', '2026-10-05', 'uploads/patagonia_found.jpg', 'campus.security@university.edu', '555-0199', 'open'),

-- Item 9: LOST Ray-Ban Tortoiseshell Prescription Eyeglasses
(9, 2, 7, 'lost', 'Ray-Ban Tortoiseshell Prescription Glasses', 'Square brown tortoiseshell frames in a black leather case. High prescription lenses with anti-reflective coating.', 'North Quad', 'Wooden picnic tables under oak trees', '2026-10-02', 'uploads/glasses_lost.jpg', 'arivera@student.university.edu', '555-0142', 'resolved'),

-- Item 10: FOUND North Face Surge Backpack
(10, 3, 4, 'found', 'Heather Grey The North Face Backpack', 'Grey backpack containing Bio 101 spiral notebook, yellow highlighter, and blue umbrella. Turned in to campus safety.', 'Main Library', 'Basement quiet study cubicle', '2026-10-03', 'uploads/backpack_found.jpg', 'mlin@student.university.edu', '555-0177', 'resolved');

-- =====================================================================
-- SEED DATA: Sample Claims for Testing
-- =====================================================================

INSERT INTO claims (id, item_id, claimer_id, message, proof_details, status, admin_notes) VALUES
(1, 4, 2, 'Hi, I lost my AirPods Pro in the Rec Center on Oct 6th.', 'The case has "A.R." laser engraved inside the top lid, and the bluetooth name is "Alex Rivera AirPods".', 'pending', 'Awaiting student to show ID and matching bluetooth pairing at front desk.'),
(2, 2, 2, 'I believe this is my sage green Hydro Flask lost in the library.', 'Has a white oval NASA sticker and a Yosemite National Park sticker, small dent on bottom rim.', 'pending', 'Photo matches description provided.'),
(3, 10, 2, 'My backpack was left in the basement cubicle.', 'The bio notebook has Alex Rivera on page 1.', 'approved', 'Verified student ID and notebook signature. Returned Oct 4th.');
