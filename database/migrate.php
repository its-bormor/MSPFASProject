<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
$pdo = db();

// Ensure base tables exist
$pdo->exec("CREATE TABLE IF NOT EXISTS members (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    fullname VARCHAR(100) NOT NULL,
    national_id VARCHAR(13) NULL UNIQUE,
    phone VARCHAR(30) NULL,
    role ENUM('member','committee','president') NOT NULL DEFAULT 'member',
    marital_status ENUM('single','married','widowed','divorced') NOT NULL DEFAULT 'single',
    spouse_name VARCHAR(100) NULL,
    address TEXT NULL,
    risk_status ENUM('normal','suspended','deceased') NOT NULL DEFAULT 'normal',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS requests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    member_id INT UNSIGNED NOT NULL,
    fiscal_year_id INT UNSIGNED NULL,
    amount_requested DECIMAL(12,2) NOT NULL DEFAULT 0,
    interest_rate DECIMAL(5,2) NOT NULL DEFAULT 6,
    purpose TEXT NULL,
    status ENUM('draft','submitted','committee_review','committee_rejected','president_review','president_rejected','contract_pending','member_confirmed','active','completed','revision_requested') NOT NULL DEFAULT 'submitted',
    committee_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    committee_note TEXT NULL,
    committee_by INT UNSIGNED NULL,
    committee_at DATETIME NULL,
    president_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    president_note TEXT NULL,
    president_by INT UNSIGNED NULL,
    president_at DATETIME NULL,
    contract_confirmed_at DATETIME NULL,
    contract_confirmed_by INT UNSIGNED NULL,
    revision_note TEXT NULL,
    checklist_documents JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_requests_member (member_id),
    INDEX idx_requests_year (fiscal_year_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id INT UNSIGNED NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_type ENUM('installment','lump_sum') NOT NULL DEFAULT 'installment',
    payment_channel ENUM('transfer','cash') NOT NULL DEFAULT 'transfer',
    payment_date DATE NOT NULL,
    slip_file VARCHAR(255) NULL,
    receipt_number VARCHAR(100) NULL,
    status ENUM('pending','verified','invalid') NOT NULL DEFAULT 'pending',
    note TEXT NULL,
    recorded_by INT UNSIGNED NULL,
    verified_by INT UNSIGNED NULL,
    verified_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_payments_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS ledger (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_date DATE NOT NULL,
    type ENUM('income','expense') NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    reference VARCHAR(100) NULL,
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ledger_date (transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS audit_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    acting_for_member_id INT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS line_announcements (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    message TEXT NOT NULL,
    sent_by INT UNSIGNED NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('draft','sent','failed') NOT NULL DEFAULT 'draft'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$cols = $pdo->query('SHOW COLUMNS FROM members')->fetchAll();
$names = array_column($cols, 'Field');
if (!in_array('national_id', $names, true)) {
    $pdo->exec('ALTER TABLE members ADD COLUMN national_id VARCHAR(13) NULL AFTER fullname');
}
$indexes = $pdo->query('SHOW INDEX FROM members')->fetchAll();
$has = false;
foreach ($indexes as $i) {
    if (($i['Key_name'] ?? '') === 'uq_members_national_id') {
        $has = true;
        break;
    }
}
if (!$has) {
    $pdo->exec('ALTER TABLE members ADD UNIQUE KEY uq_members_national_id (national_id)');
}

echo "Database migration complete.\n";
