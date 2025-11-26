-- PostgreSQL schema for College Help Desk chatbot
-- Run with: psql -U <user> -d <db> -f backend/sql/schema_postgres.sql

CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fees_structures (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    prospectus_fees NUMERIC DEFAULT 0,
    tuition_fees NUMERIC DEFAULT 0,
    development_fees NUMERIC DEFAULT 0,
    training_placement_fees NUMERIC DEFAULT 0,
    iste_fees NUMERIC DEFAULT 0,
    library_lab_fees NUMERIC DEFAULT 0,
    student_insurance NUMERIC DEFAULT 0,
    total_fees NUMERIC DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admission_documents (
    id SERIAL PRIMARY KEY,
    admission_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS library_books (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    book_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS library_timings (
    id SERIAL PRIMARY KEY,
    issue_start_time VARCHAR(10) NOT NULL,
    issue_end_time VARCHAR(10) NOT NULL,
    return_start_time VARCHAR(10) NOT NULL,
    return_end_time VARCHAR(10) NOT NULL,
    lunch_break_start VARCHAR(10) NOT NULL,
    lunch_break_end VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS hostel_information (
    id SERIAL PRIMARY KEY,
    facility_name VARCHAR(200) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    hostel_fees_per_semester NUMERIC DEFAULT 0,
    mess_fees_per_month NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scholarships (
    id SERIAL PRIMARY KEY,
    scholarship_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount VARCHAR(100) NOT NULL,
    eligibility TEXT NOT NULL,
    documents_required TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS faculty (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    subjects_taught TEXT DEFAULT '',
    contact VARCHAR(20) DEFAULT '',
    email VARCHAR(100) DEFAULT '',
    photo_url VARCHAR(500) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS principal_info (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    education TEXT NOT NULL,
    achievements TEXT DEFAULT '',
    medals TEXT DEFAULT '',
    contact VARCHAR(20) DEFAULT '',
    email VARCHAR(100) DEFAULT '',
    photo_url VARCHAR(500) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(200) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    description TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS college_timings (
    id SERIAL PRIMARY KEY,
    opening_time VARCHAR(10) NOT NULL,
    closing_time VARCHAR(10) NOT NULL,
    saturday_opening VARCHAR(10) NOT NULL,
    saturday_closing VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS student_fees_payments (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(200) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    admission_year VARCHAR(10) NOT NULL,
    category VARCHAR(50) NOT NULL,
    total_fees NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    remaining_amount NUMERIC DEFAULT 0,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    receipt_number VARCHAR(100) NOT NULL,
    semester VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS help_tickets (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(200) NOT NULL,
    contact VARCHAR(100) NOT NULL,
    query TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

