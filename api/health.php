<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
try {
    $pdo = db();
    $db = $pdo->query('SELECT DATABASE() AS db, VERSION() AS version')->fetch();
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status'=>'success','app'=>'village-fund','php'=>PHP_VERSION,'database'=>$db], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status'=>'error','message'=>'Database connection failed'], JSON_UNESCAPED_UNICODE);
}
