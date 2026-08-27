<?php
declare(strict_types=1);

function load_local_env(): void {
    static $loaded = false;
    if ($loaded) return;
    $loaded = true;

    $file = getenv('DB_ENV_FILE');
    if (!$file) {
        $renderSecret = '/etc/secrets/.env';
        $file = is_file($renderSecret) ? $renderSecret : (__DIR__ . '/.env');
    }

    if (is_file($file) && is_readable($file)) {
        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (is_array($lines)) {
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || substr($line, 0, 1) === '#') continue;
                if (strpos($line, '=') === false) continue;
                [$key, $value] = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                if ($key === '' || getenv($key) !== false) continue;
                if (strlen($value) >= 2 && (($value[0] === '"' && $value[-1] === '"') || ($value[0] === "'" && $value[-1] === "'"))) {
                    $value = substr($value, 1, -1);
                }
                putenv($key . '=' . $value);
            }
        }
    }

    $runtime = __DIR__ . '/runtime.php';
    if (is_file($runtime) && is_readable($runtime)) {
        $values = require $runtime;
        if (is_array($values)) {
            foreach ($values as $key => $value) {
                if (is_string($key) && $key !== '' && getenv($key) === false) {
                    putenv($key . '=' . (string)$value);
                }
            }
        }
    }
}

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    load_local_env();

    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $name = getenv('DB_NAME') ?: 'village_fund';
    $user = getenv('DB_USER') ?: 'root';
    $pass = getenv('DB_PASS') ?: '';
    $port = getenv('DB_PORT') ?: '3306';

    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function json_input(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function json_response(array $data, int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function require_login(): array {
    if (session_status() !== PHP_SESSION_ACTIVE) session_start();
    if (empty($_SESSION['user'])) json_response(['status'=>'error','message'=>'กรุณาเข้าสู่ระบบ'], 401);
    return $_SESSION['user'];
}

function require_role(array $roles): array {
    $user = require_login();
    if (!in_array($user['role'], $roles, true)) json_response(['status'=>'error','message'=>'คุณไม่มีสิทธิ์ดำเนินการนี้'], 403);
    return $user;
}
