<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
$pdo = db();
$pdo->exec("CREATE TABLE IF NOT EXISTS procurement_receipts (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 batch_id INT UNSIGNED NOT NULL,
 status ENUM('pending','inspected','accepted','partial','rejected') NOT NULL DEFAULT 'pending',
 inspected_by INT UNSIGNED NULL,
 inspected_at DATETIME NULL,
 received_note TEXT NULL,
 rejection_note TEXT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (batch_id) REFERENCES procurement_batches(id) ON DELETE CASCADE,
 UNIQUE KEY uq_receipt_batch (batch_id)
) ENGINE=InnoDB");
$pdo->exec("CREATE TABLE IF NOT EXISTS procurement_receipt_items (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 receipt_id INT UNSIGNED NOT NULL,
 batch_item_id INT UNSIGNED NOT NULL,
 quantity_expected DECIMAL(12,2) NOT NULL DEFAULT 0,
 quantity_counted DECIMAL(12,2) NOT NULL DEFAULT 0,
 condition_status ENUM('good','damaged','short','wrong_item') NOT NULL DEFAULT 'good',
 note TEXT NULL,
 FOREIGN KEY (receipt_id) REFERENCES procurement_receipts(id) ON DELETE CASCADE,
 FOREIGN KEY (batch_item_id) REFERENCES procurement_batch_items(id) ON DELETE CASCADE
) ENGINE=InnoDB");
echo "Receiving inspection migration v4 completed.\n";
