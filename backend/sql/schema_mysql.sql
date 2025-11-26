-- MySQL schema for College Help Desk chatbot
-- Run with: mysql -u <user> -p <database_name> < backend/sql/schema_mysql.sql

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fees_structures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    prospectus_fees DECIMAL(10, 2) DEFAULT 0,
    tuition_fees DECIMAL(10, 2) DEFAULT 0,
    development_fees DECIMAL(10, 2) DEFAULT 0,
    training_placement_fees DECIMAL(10, 2) DEFAULT 0,
    iste_fees DECIMAL(10, 2) DEFAULT 0,
    library_lab_fees DECIMAL(10, 2) DEFAULT 0,
    student_insurance DECIMAL(10, 2) DEFAULT 0,
    total_fees DECIMAL(10, 2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admission_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admission_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS library_books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    book_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS library_timings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    issue_start_time VARCHAR(10) NOT NULL,
    issue_end_time VARCHAR(10) NOT NULL,
    return_start_time VARCHAR(10) NOT NULL,
    return_end_time VARCHAR(10) NOT NULL,
    lunch_break_start VARCHAR(10) NOT NULL,
    lunch_break_end VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS hostel_information (
    id INT AUTO_INCREMENT PRIMARY KEY,
    facility_name VARCHAR(200) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    hostel_fees_per_semester DECIMAL(10, 2) DEFAULT 0,
    mess_fees_per_month DECIMAL(10, 2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scholarships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scholarship_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount VARCHAR(100) NOT NULL,
    eligibility TEXT NOT NULL,
    documents_required TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS faculty (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    subjects_taught TEXT DEFAULT '',
    contact VARCHAR(20) DEFAULT '',
    email VARCHAR(100) DEFAULT '',
    photo_url VARCHAR(500) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS principal_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    education TEXT NOT NULL,
    achievements TEXT DEFAULT '',
    medals TEXT DEFAULT '',
    contact VARCHAR(20) DEFAULT '',
    email VARCHAR(100) DEFAULT '',
    photo_url VARCHAR(500) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(200) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    description TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS college_timings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    opening_time VARCHAR(10) NOT NULL,
    closing_time VARCHAR(10) NOT NULL,
    saturday_opening VARCHAR(10) NOT NULL,
    saturday_closing VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS student_fees_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_name VARCHAR(200) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    admission_year VARCHAR(10) NOT NULL,
    category VARCHAR(50) NOT NULL,
    total_fees DECIMAL(10, 2) DEFAULT 0,
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    remaining_amount DECIMAL(10, 2) DEFAULT 0,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    receipt_number VARCHAR(100) NOT NULL,
    semester VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS help_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_name VARCHAR(200) NOT NULL,
    contact VARCHAR(100) NOT NULL,
    topic VARCHAR(100) NULL,
    `query` TEXT NOT NULL,
    pdf_filename VARCHAR(255) NULL,
    status VARCHAR(50) DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL
);

