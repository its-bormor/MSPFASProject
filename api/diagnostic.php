<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $config = load_local_env();

    $keys = ['DB_HOST','DB_NAME','DB_USER','DB_PASS','DB_PORT'];
    $present = [];
    foreach ($keys as $key) {
        $value = $config[$key] ?? getenv($key);
        $present[$key] = ($value !== false && $value !== null && $value !== '');
    }

    $runtime_file = __DIR__ . '/../config/runtime.php';
    $runtime_debug = [
        'file' => $runtime_file,
        'exists' => is_file($runtime_file),
        'readable' => is_readable($runtime_file),
        'size' => is_file($runtime_file) ? filesize($runtime_file) : null,
    ];

    if (is_file($runtime_file) && is_readable($runtime_file)) {
        try {
            $runtime = require $runtime_file;
            $runtime_debug['valid_array'] = is_array($runtime);
            $runtime_debug['keys'] = is_array($runtime) ? array_values(array_intersect(array_keys($runtime), $keys)) : [];
            $runtime_debug['values_present'] = [];
            foreach ($keys as $key) {
                $value = is_array($runtime) ? ($runtime[$key] ?? null) : null;
                $runtime_debug['values_present'][$key] = ($value !== null && $value !== '');
            }
        } catch (Throwable $e) {
            $runtime_debug['load_error'] = $e->getMessage();
        }
    }

    $effective = [
        'DB_HOST' => $config['DB_HOST'] ?? (getenv('DB_HOST') ?: null),
        'DB_NAME' => $config['DB_NAME'] ?? (getenv('DB_NAME') ?: null),
        'DB_USER' => $config['DB_USER'] ?? (getenv('DB_USER') ?: null),
        'DB_PORT' => $config['DB_PORT'] ?? (getenv('DB_PORT') ?: null),
        'DB_PASS' => $present['DB_PASS'],
    ];

    try {
        db();
        echo json_encode([
            'status' => 'success',
            'db' => 'connected',
            'env' => $present,
            'runtime_debug' => $runtime_debug,
            'effective' => $effective,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } catch (Throwable $e) {
        http_response_code(500);
        $message = preg_replace('/password|passwd|pwd/i', '[REDACTED]', $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'db' => 'failed',
            'env' => $present,
            'runtime_debug' => $runtime_debug,
            'effective' => $effective,
            'error' => $message,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status'=>'error','error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
