<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';

$pdo = db();
// DDL statements in MySQL can implicitly commit an open transaction.\n// Keep this migration idempotent and avoid wrapping DDL + data updates in one transaction.

function hasTable(PDO $pdo, string $table): bool {
    $s = $pdo->prepare('SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
    $s->execute([$table]);
    return (bool)$s->fetchColumn();
}
function hasColumn(PDO $pdo, string $table, string $column): bool {
    $s = $pdo->prepare('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
    $s->execute([$table, $column]);
    return (bool)$s->fetchColumn();
}
function addColumn(PDO $pdo, string $table, string $column, string $definition): void {
    if (!hasColumn($pdo, $table, $column)) $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
}

$pdo->exec("CREATE TABLE IF NOT EXISTS fiscal_years (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    year_be SMALLINT UNSIGNED NOT NULL UNIQUE,
    status ENUM('open','closed') NOT NULL DEFAULT 'open',
    request_open TINYINT(1) NOT NULL DEFAULT 0,
    market_survey_done TINYINT(1) NOT NULL DEFAULT 0,
    opened_at DATETIME NULL,
    closed_at DATETIME NULL,
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS catalog_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fiscal_year_id INT UNSIGNED NOT NULL,
    category ENUM('fertilizer','medicine','seed','other') NOT NULL DEFAULT 'fertilizer',
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    unit VARCHAR(100) NOT NULL DEFAULT 'รายการ',
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    image_file VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_catalog_year_active (fiscal_year_id,is_active),
    FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS request_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id INT UNSIGNED NOT NULL,
    catalog_item_id INT UNSIGNED NOT NULL,
    item_name_snapshot VARCHAR(255) NOT NULL,
    unit_snapshot VARCHAR(100) NOT NULL,
    unit_price_snapshot DECIMAL(12,2) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
    line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
    FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id),
    INDEX idx_request_items_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS request_guarantors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id INT UNSIGNED NOT NULL,
    guarantor_no TINYINT UNSIGNED NOT NULL,
    fullname VARCHAR(200) NOT NULL,
    national_id VARCHAR(13) NULL,
    phone VARCHAR(30) NULL,
    address TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_request_guarantor_no (request_id,guarantor_no),
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS request_documents (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id INT UNSIGNED NOT NULL,
    document_type VARCHAR(80) NOT NULL,
    file_name VARCHAR(255) NULL,
    status ENUM('missing','submitted','verified','rejected') NOT NULL DEFAULT 'missing',
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_request_documents_request (request_id),
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS installment_plans (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id INT UNSIGNED NOT NULL UNIQUE,
    payment_mode ENUM('lump_sum','installment') NOT NULL DEFAULT 'installment',
    installment_count SMALLINT UNSIGNED NULL,
    principal_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    interest_rate DECIMAL(5,2) NOT NULL DEFAULT 6,
    interest_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    risk_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_payable DECIMAL(12,2) NOT NULL DEFAULT 0,
    first_due_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS installments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    plan_id INT UNSIGNED NOT NULL,
    installment_no SMALLINT UNSIGNED NOT NULL,
    due_date DATE NOT NULL,
    principal_due DECIMAL(12,2) NOT NULL DEFAULT 0,
    interest_due DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_due DECIMAL(12,2) NOT NULL DEFAULT 0,
    status ENUM('pending','partial','paid','overdue','waived') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_plan_installment (plan_id,installment_no),
    FOREIGN KEY (plan_id) REFERENCES installment_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

addColumn($pdo, 'requests', 'fiscal_year_id', 'INT UNSIGNED NULL AFTER member_id');
addColumn($pdo, 'requests', 'status', "ENUM('draft','submitted','committee_review','committee_rejected','president_review','president_rejected','contract_pending','member_confirmed','active','completed','revision_requested') NOT NULL DEFAULT 'submitted' AFTER purpose");
addColumn($pdo, 'requests', 'revision_note', 'TEXT NULL AFTER status');
addColumn($pdo, 'requests', 'contract_confirmed_at', 'DATETIME NULL AFTER president_at');
addColumn($pdo, 'requests', 'contract_confirmed_by', 'INT UNSIGNED NULL AFTER contract_confirmed_at');
addColumn($pdo, 'requests', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
addColumn($pdo, 'payments', 'payment_channel', "ENUM('transfer','cash') NOT NULL DEFAULT 'transfer' AFTER payment_type");
addColumn($pdo, 'payments', 'receipt_number', 'VARCHAR(100) NULL AFTER slip_file');
addColumn($pdo, 'payments', 'recorded_by', 'INT UNSIGNED NULL AFTER verified_at');
addColumn($pdo, 'audit_logs', 'acting_for_member_id', 'INT UNSIGNED NULL AFTER user_id');
addColumn($pdo, 'audit_logs', 'details', 'TEXT NULL AFTER action');

$year = (int)date('Y') + 543;
$s = $pdo->prepare('INSERT IGNORE INTO fiscal_years (year_be,status,request_open,created_by) VALUES (?,\'open\',0,NULL)');
$s->execute([$year]);
$fy = (int)$pdo->query('SELECT id FROM fiscal_years WHERE year_be=' . $year . ' LIMIT 1')->fetchColumn();
$pdo->prepare('UPDATE requests SET fiscal_year_id=? WHERE fiscal_year_id IS NULL')->execute([$fy]);
$pdo->exec("UPDATE requests SET status=CASE WHEN president_status='approved' THEN 'contract_pending' WHEN president_status='rejected' THEN 'revision_requested' WHEN committee_status='approved' THEN 'president_review' WHEN committee_status='rejected' THEN 'revision_requested' ELSE 'submitted' END WHERE status='submitted'");

// No commit() here: MySQL DDL may implicitly commit, so there is no\n// guaranteed active transaction at this point.
echo "Migration v2 complete. Fiscal year {$year} is ready (request intake is closed by default).\n";
