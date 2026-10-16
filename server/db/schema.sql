-- ========================================================
-- NexSociety - PostgreSQL Database Schema
-- ========================================================

-- 1. Users Table (Security, Resident, Admin)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('security', 'resident', 'admin')),
    flat_number VARCHAR(20),
    tower VARCHAR(20),
    phone VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Visitors Table (Security Gate Log)
CREATE TABLE IF NOT EXISTS visitors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    flat_number VARCHAR(20) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    vehicle_no VARCHAR(50) DEFAULT 'None',
    entry_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'inside' CHECK (status IN ('inside', 'checked-out')),
    photo_url TEXT,
    gate_number VARCHAR(20) DEFAULT 'Gate 1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Pre-Approved Visitor Passes
CREATE TABLE IF NOT EXISTS preapproved_passes (
    id VARCHAR(50) PRIMARY KEY,
    guest_name VARCHAR(100) NOT NULL,
    guest_phone VARCHAR(30) NOT NULL,
    flat_number VARCHAR(20) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    arrival_date DATE NOT NULL,
    pin_otp VARCHAR(10) NOT NULL,
    pass_code VARCHAR(50) NOT NULL,
    vehicle_no VARCHAR(50) DEFAULT 'None',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'revoked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Helpdesk Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id VARCHAR(50) PRIMARY KEY,
    flat_number VARCHAR(20) NOT NULL,
    resident_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Emergency')),
    details TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'In Review' CHECK (status IN ('In Review', 'Resolved', 'Withdrawn')),
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 5. Maintenance Dues & Receipts Table
CREATE TABLE IF NOT EXISTS maintenance_dues (
    id VARCHAR(50) PRIMARY KEY,
    flat_number VARCHAR(20) NOT NULL,
    resident_name VARCHAR(100) NOT NULL,
    tower VARCHAR(20) NOT NULL,
    phone VARCHAR(30),
    bay_number VARCHAR(30),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 4250.00,
    month VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
    transaction_id VARCHAR(100),
    payment_mode VARCHAR(50),
    paid_at TIMESTAMP WITH TIME ZONE
);

-- 6. Society Circulars & Broadcast Notices Table
CREATE TABLE IF NOT EXISTS notices (
    id VARCHAR(50) PRIMARY KEY,
    headline VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    published_by VARCHAR(100) DEFAULT 'Society Executive Desk',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_flat ON visitors(flat_number);
CREATE INDEX IF NOT EXISTS idx_preapproved_otp ON preapproved_passes(pin_otp);
CREATE INDEX IF NOT EXISTS idx_complaints_flat ON complaints(flat_number);
CREATE INDEX IF NOT EXISTS idx_dues_flat ON maintenance_dues(flat_number);
