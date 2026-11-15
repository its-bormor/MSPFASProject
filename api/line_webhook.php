<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit;
}

$config = load_local_env();
$channelSecret = trim((string)($config['LINE_CHANNEL_SECRET'] ?? getenv('LINE_CHANNEL_SECRET') ?: ''));
if ($channelSecret === '') {
    http_response_code(503);
    exit;
}

$body = file_get_contents('php://input');
$signature = (string)($_SERVER['HTTP_X_LINE_SIGNATURE'] ?? '');
$expectedSignature = base64_encode(hash_hmac('sha256', $body, $channelSecret, true));
if ($signature === '' || !hash_equals($expectedSignature, $signature)) {
    http_response_code(401);
    exit;
}

$payload = json_decode($body, true);
if (!is_array($payload) || !isset($payload['events']) || !is_array($payload['events'])) {
    http_response_code(400);
    exit;
}

foreach ($payload['events'] as $event) {
    $source = $event['source'] ?? [];
    $groupId = $source['groupId'] ?? null;
    if (($source['type'] ?? '') === 'group' && is_string($groupId) && $groupId !== '') {
        // Log only the group ID so it can be copied from the local PHP server console.
        error_log('[LINE_WEBHOOK_GROUP_ID] ' . $groupId);
    }
}

http_response_code(200);
header('Content-Type: application/json; charset=utf-8');
echo '{"status":"ok"}';
