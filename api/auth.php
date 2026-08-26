<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
if (session_status() !== PHP_SESSION_ACTIVE) session_start();

$action = $_GET['action'] ?? 'status';

try {
    $pdo = db();
    if ($action === 'status') {
        json_response(['status'=>'success','logged_in'=>!empty($_SESSION['user']),'user'=>$_SESSION['user'] ?? null]);
    }
    if ($action === 'login') {
        session_regenerate_id(true);
        $data = json_input();
        $stmt = $pdo->prepare('SELECT id, username, password, fullname, national_id, phone, role, marital_status, spouse_name, address, risk_status FROM members WHERE username = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([trim((string)($data['username'] ?? ''))]);
        $row = $stmt->fetch();
        if (!$row || !password_verify((string)($data['password'] ?? ''), $row['password'])) {
            json_response(['status'=>'error','message'=>'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'], 401);
        }
        unset($row['password']);
        $_SESSION['user'] = $row;
        $pdo->prepare('INSERT INTO audit_logs (user_id, action, ip_address) VALUES (?, ?, ?)')->execute([$row['id'],'login',$_SERVER['REMOTE_ADDR'] ?? null]);
        json_response(['status'=>'success','message'=>'เข้าสู่ระบบสำเร็จ','user'=>$row]);
    }
    if ($action === 'logout') {
        $id = $_SESSION['user']['id'] ?? null;
        if ($id) $pdo->prepare('INSERT INTO audit_logs (user_id, action, ip_address) VALUES (?, ?, ?)')->execute([$id,'logout',$_SERVER['REMOTE_ADDR'] ?? null]);
        $_SESSION = [];
        if (ini_get('session.use_cookies')) { $p = session_get_cookie_params(); setcookie(session_name(), '', time()-42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']); }
        session_destroy();
        json_response(['status'=>'success','message'=>'ออกจากระบบแล้ว']);
    }
    json_response(['status'=>'error','message'=>'ไม่พบคำสั่ง'], 400);
} catch (Throwable $e) {
    error_log($e->getMessage());
    json_response(['status'=>'error','message'=>'เกิดข้อผิดพลาดของระบบ'], 500);
}
