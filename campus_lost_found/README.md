# CampusFind - University Lost & Found Portal

A production-ready full-stack Lost and Found web application designed specifically for college campuses.

## Tech Stack
- **Frontend**: Plain Semantic HTML5, Modular CSS3 (single accent blue palette, zero-pill typography, mobile-responsive), Vanilla JavaScript (ES6+ `fetch()` API).
- **Backend**: Python 3.10+, Flask, Flask-Session (secure server-side session management), Werkzeug (PBKDF2/scrypt password hashing & secure file uploads).
- **Database**: MySQL 8.0+ / MariaDB with InnoDB engine, parameterized queries, full-text indexes, and foreign key constraints.

---

## Project Folder Structure

```text
campus_lost_found/
├── .env.example              # Environment variables template
├── .env                      # Local environment configuration (keep secret)
├── requirements.txt          # Python dependencies
├── schema.sql                # MySQL schema definitions + 10 sample rows
├── app.py                    # Flask REST API backend & session authentication
├── templates/
│   └── index.html            # Single-page semantic HTML structure
├── static/
│   ├── css/
│   │   └── style.css         # Modern card layout & design system
│   ├── js/
│   │   └── app.js            # Client-side routing, API calls, and matching logic
│   └── uploads/              # Validated user image uploads directory
└── README.md                 # Setup, testing, and deployment instructions
```

---

## Local Development Setup

### 1. Database Provisioning (MySQL)
Make sure MySQL 8.0+ is installed and running on your system.
```bash
# Log in to MySQL as root
mysql -u root -p

# Create the database and dedicated user
CREATE DATABASE campus_lost_found CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lostfound_user'@'localhost' IDENTIFIED BY 'your_secure_mysql_password';
GRANT ALL PRIVILEGES ON campus_lost_found.* TO 'lostfound_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import the schema and seed data
mysql -u lostfound_user -p campus_lost_found < schema.sql
```

### 2. Python Virtual Environment & Dependencies
```bash
# Navigate to the project root
cd campus_lost_found

# Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration
```bash
cp .env.example .env
```
Edit `.env` and configure your MySQL credentials and a secure random secret key:
```ini
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=94c1a8e1f0b48f9cb34c8928a385f028da39b5b290740a6b7e5e
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=campus_lost_found
DB_USER=lostfound_user
DB_PASSWORD=your_secure_mysql_password
UPLOAD_FOLDER=static/uploads
MAX_CONTENT_LENGTH=5242880
```

### 4. Run the Flask Server
```bash
python app.py
```
Open your browser to `http://localhost:5000` to access the application!

---

## Seed Accounts for Testing
- **Student Account**:
  - Email: `arivera@student.university.edu`
  - Password: `CampusPass2026!`
- **Campus Security / Admin Account**:
  - Email: `campus.security@university.edu`
  - Password: `CampusPass2026!`

---

## Production Deployment Guide

### Architecture: Nginx + Gunicorn + Systemd + MySQL
1. **WSGI Server (Gunicorn)**:
   ```bash
   pip install gunicorn
   # Test run
   gunicorn -w 4 -b 127.0.0.1:8000 app:app
   ```

2. **Systemd Service (`/etc/systemd/system/campusfind.service`)**:
   ```ini
   [Unit]
   Description=Gunicorn instance to serve Campus Lost & Found
   After=network.target

   [Service]
   User=www-data
   Group=www-data
   WorkingDirectory=/var/www/campus_lost_found
   Environment="PATH=/var/www/campus_lost_found/venv/bin"
   ExecStart=/var/www/campus_lost_found/venv/bin/gunicorn --workers 4 --bind 127.0.0.1:8000 app:app

   [Install]
   WantedBy=multi-user.target
   ```
   Enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl start campusfind
   sudo systemctl enable campusfind
   ```

3. **Nginx Reverse Proxy (`/etc/nginx/sites-available/campusfind`)**:
   ```nginx
   server {
       listen 80;
       server_name lostandfound.university.edu;

       client_max_body_size 5M;

       # Serve static files directly with caching
       location /static/ {
           alias /var/www/campus_lost_found/static/;
           expires 30d;
           add_header Cache-Control "public, no-transform";
       }

       # Proxy API and pages to Gunicorn
       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   Enable site and obtain SSL via Let's Encrypt:
   ```bash
   sudo ln -s /etc/nginx/sites-available/campusfind /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   sudo certbot --nginx -d lostandfound.university.edu
   ```
