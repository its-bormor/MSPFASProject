<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

$user = require_role(['committee']);
$action = $_GET['action'] ?? 'list';

try {
    $pdo = db();

    if ($action === 'list') {
        $stmt = $pdo->query('SELECT id, message, sent_at, status FROM line_announcements ORDER BY id DESC LIMIT 50');
        json_response(['status' => 'success', 'data' => $stmt->fetchAll()]);
    }

    if ($action !== 'send') {
        json_response(['status' => 'error', 'message' => 'ไม่พบคำสั่ง'], 400);
    }

    $data = json_input();
    $message = trim((string)($data['message'] ?? ''));
    if ($message === '') {
        json_response(['status' => 'error', 'message' => 'กรุณากรอกข้อความ'], 422);
    }

    $config = load_local_env();
    $channelToken = trim((string)($config['LINE_CHANNEL_ACCESS_TOKEN'] ?? getenv('LINE_CHANNEL_ACCESS_TOKEN') ?: ''));
    $groupId = trim((string)($config['LINE_GROUP_ID'] ?? getenv('LINE_GROUP_ID') ?: ''));
    if ($channelToken === '' || $groupId === '') {
        json_response(['status' => 'error', 'message' => 'ยังไม่ได้ตั้งค่า LINE Channel Access Token หรือ Group ID'], 503);
    }

    $insert = $pdo->prepare("INSERT INTO line_announcements (message, sent_by, status) VALUES (?, ?, 'draft')");
    $insert->execute([$message, $user['id']]);
    $announcementId = (int)$pdo->lastInsertId();

    $curl = curl_init('https://api.line.me/v2/bot/message/push');
    if ($curl === false) {
        $pdo->prepare("UPDATE line_announcements SET status = 'failed' WHERE id = ?")->execute([$announcementId]);
        json_response(['status' => 'error', 'message' => 'ไม่สามารถเริ่มการเชื่อมต่อ LINE ได้'], 502);
    }

    $payload = [
        'to' => $groupId,
        'messages' => [[
            'type' => 'text',
            'text' => $message,
        ]],
    ];
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $channelToken,
            'Content-Type: application/json',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
    ]);

    $response = curl_exec($curl);
    $statusCode = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);

    $sent = $response !== false && $statusCode >= 200 && $statusCode < 300;
    $pdo->prepare('UPDATE line_announcements SET status = ? WHERE id = ?')->execute([$sent ? 'sent' : 'failed', $announcementId]);

    if (!$sent) {
        error_log('LINE Messaging API push failed. HTTP ' . $statusCode . ($curlError !== '' ? ': ' . $curlError : ''));
        json_response(['status' => 'error', 'message' => 'ส่ง LINE ไม่สำเร็จ กรุณาตรวจสอบ Token, Group ID และโควตาข้อความ'], 502);
    }

    json_response(['status' => 'success', 'message' => 'ส่งประกาศเข้า LINE กลุ่มเรียบร้อยแล้ว']);
} catch (Throwable $e) {
    error_log($e->getMessage());
    json_response(['status' => 'error', 'message' => 'เกิดข้อผิดพลาดของระบบ'], 500);
}
