<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/spreadsheet_helper.php';
$user = require_login();
$action = $_GET['action'] ?? 'list';

function memberSafeRow(array $row): array {
    unset($row['password']);
    return $row;
}

try {
    $pdo = db();

    if ($action === 'list' || $action === 'search') {
        $sql = 'SELECT id, username, fullname, national_id, phone, role, marital_status, spouse_name, address, risk_status, is_active, created_at FROM members';
        $params = [];
        $search = trim((string)($_GET['search'] ?? ''));
        if ($search !== '') {
            $sql .= ' WHERE fullname LIKE ? OR username LIKE ? OR national_id LIKE ? OR phone LIKE ?';
            $q = '%' . $search . '%';
            $params = [$q,$q,$q,$q];
        }
        if ($user['role'] === 'member') {
            $sql .= ($search !== '' ? ' AND ' : ' WHERE ') . 'id=?';
            $params[] = $user['id'];
        }
        $sql .= ' ORDER BY fullname ASC';
        $stmt = $pdo->prepare($sql); $stmt->execute($params);
        json_response(['status'=>'success','data'=>$stmt->fetchAll()]);
    }

    if ($action === 'detail') {
        $id=(int)($_GET['id'] ?? 0);
        $stmt=$pdo->prepare('SELECT id,username,fullname,national_id,phone,role,marital_status,spouse_name,address,risk_status,is_active,created_at FROM members WHERE id=?');
        $stmt->execute([$id]); $row=$stmt->fetch();
        if (!$row) json_response(['status'=>'error','message'=>'ไม่พบสมาชิก'],404);
        if ($user['role']==='member' && (int)$row['id']!==(int)$user['id']) json_response(['status'=>'error','message'=>'ไม่มีสิทธิ์เข้าถึง'],403);
        json_response(['status'=>'success','data'=>$row]);
    }

    if ($action === 'update' && $user['role']==='member') {
        $d=json_input();$id=(int)($d['id']??0);if($id!==(int)$user['id']||empty($d['password']))json_response(['status'=>'error','message'=>'สมาชิกแก้ไขได้เฉพาะรหัสผ่านของตนเอง'],403);
        $pdo->prepare('UPDATE members SET password=? WHERE id=?')->execute([password_hash((string)$d['password'],PASSWORD_DEFAULT),$id]);
        $pdo->prepare('INSERT INTO audit_logs(user_id,action,details,ip_address) VALUES(?,?,?,?)')->execute([$user['id'],'password_change','สมาชิกเปลี่ยนรหัสผ่านของตนเอง',$_SERVER['REMOTE_ADDR']??null]);
        json_response(['status'=>'success','message'=>'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว']);
    }
    require_role(['committee','president']);

    if ($action === 'import_template') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="member_import_template.csv"');
        echo "\xEF\xBB\xBF";
        $out = fopen('php://output', 'w');
        fputcsv($out, ['รหัสสมาชิก', 'ชื่อ-นามสกุล', 'เลขบัตรประชาชน', 'เบอร์โทรศัพท์', 'รหัสผ่าน', 'สถานะสมรส', 'ชื่อคู่สมรส', 'ที่อยู่'], ',', '"', "\\");
        fputcsv($out, ['M001', 'นายสมชาย ใจดี', '1549900123456', '0812345678', '123456', 'สมรส', 'นางสมหญิง ใจดี', '123 หมู่ 5 ต.แม่ยางตาล อ.ร้องกวาง จ.แพร่'], ',', '"', "\\");
        fputcsv($out, ['M002', 'นางสาวมาลี รักสงบ', '1549900234567', '0898765432', '123456', 'โสด', '', '45 หมู่ 5 ต.แม่ยางตาล อ.ร้องกวาง จ.แพร่'], ',', '"', "\\");
        fclose($out);
        exit;
    }

    if ($action === 'import') {
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            json_response(['status' => 'error', 'message' => 'กรุณาเลือกไฟล์ที่ต้องการนำเข้า'], 422);
        }
        $file = $_FILES['file'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['csv', 'xlsx'], true)) {
            json_response(['status' => 'error', 'message' => 'รองรับเฉพาะไฟล์ .csv หรือ .xlsx เท่านั้น'], 422);
        }

        try {
            $rows = $ext === 'xlsx' ? parse_xlsx_file($file['tmp_name']) : parse_csv_file($file['tmp_name']);
        } catch (Throwable $e) {
            json_response(['status' => 'error', 'message' => 'ไม่สามารถอ่านไฟล์ได้: ' . $e->getMessage()], 422);
        }

        if (count($rows) < 2) {
            json_response(['status' => 'error', 'message' => 'ไฟล์ไม่มีข้อมูลสมาชิก หรือไม่มีแถวหัวตาราง'], 422);
        }

        $headerRow = array_shift($rows);
        $colKeyMap = normalize_member_headers($headerRow);

        if (!in_array('username', $colKeyMap, true) || !in_array('fullname', $colKeyMap, true)) {
            json_response([
                'status' => 'error',
                'message' => 'หัวตารางต้องมีคอลัมน์ "รหัสสมาชิก" (username) และ "ชื่อ-นามสกุล" (fullname) เป็นอย่างน้อย'
            ], 422);
        }

        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        $maritalMap = [
            'โสด' => 'single', 'single' => 'single',
            'สมรส' => 'married', 'married' => 'married',
            'หม้าย' => 'widowed', 'widowed' => 'widowed',
            'หย่า' => 'divorced', 'หย่าร้าง' => 'divorced', 'divorced' => 'divorced'
        ];
        $riskMap = [
            'ปกติ' => 'normal', 'normal' => 'normal',
            'พักชำระหนี้' => 'suspended', 'พักชำระ' => 'suspended', 'suspended' => 'suspended',
            'เสียชีวิต' => 'deceased', 'deceased' => 'deceased'
        ];

        $pdo->beginTransaction();
        try {
            foreach ($rows as $lineIdx => $row) {
                $rowNum = $lineIdx + 2;
                $record = [];
                foreach ($colKeyMap as $colIdx => $key) {
                    $record[$key] = $row[$colIdx] ?? '';
                }

                $username = trim((string)($record['username'] ?? ''));
                $fullname = trim((string)($record['fullname'] ?? ''));
                if ($username === '' || $fullname === '') {
                    $skipped++;
                    $errors[] = "แถวที่ {$rowNum}: ข้ามเนื่องจากชื่อผู้ใช้หรือชื่อ-นามสกุลว่าง";
                    continue;
                }

                $nationalId = trim((string)($record['national_id'] ?? ''));
                $nationalId = $nationalId === '' ? null : preg_replace('/[^0-9]/', '', $nationalId);
                if ($nationalId !== null && strlen($nationalId) !== 13) {
                    $nationalId = null;
                }

                $phone = trim((string)($record['phone'] ?? ''));
                $passwordRaw = trim((string)($record['password'] ?? ''));
                if ($passwordRaw === '') {
                    $passwordRaw = '123456';
                }
                $passwordHash = password_hash($passwordRaw, PASSWORD_DEFAULT);

                $role = strtolower(trim((string)($record['role'] ?? 'member')));
                if (!in_array($role, ['member', 'committee', 'president'], true)) {
                    $role = 'member';
                }

                $marital = mb_strtolower(trim((string)($record['marital_status'] ?? 'single')), 'UTF-8');
                $maritalStatus = $maritalMap[$marital] ?? 'single';

                $spouseName = trim((string)($record['spouse_name'] ?? ''));
                $address = trim((string)($record['address'] ?? ''));

                $risk = mb_strtolower(trim((string)($record['risk_status'] ?? 'normal')), 'UTF-8');
                $riskStatus = $riskMap[$risk] ?? 'normal';

                $check = $pdo->prepare('SELECT id FROM members WHERE username = ? LIMIT 1');
                $check->execute([$username]);
                $existing = $check->fetch();

                if ($existing) {
                    $memberId = (int)$existing['id'];
                    $upStmt = $pdo->prepare('UPDATE members SET fullname=?, national_id=COALESCE(?, national_id), phone=COALESCE(?, phone), marital_status=?, spouse_name=?, address=?, risk_status=?, is_active=1 WHERE id=?');
                    $upStmt->execute([$fullname, $nationalId, $phone !== '' ? $phone : null, $maritalStatus, $spouseName, $address, $riskStatus, $memberId]);
                    $updated++;
                } else {
                    if ($nationalId !== null) {
                        $checkNid = $pdo->prepare('SELECT id FROM members WHERE national_id = ? LIMIT 1');
                        $checkNid->execute([$nationalId]);
                        if ($checkNid->fetch()) {
                            $nationalId = null;
                        }
                    }

                    $insStmt = $pdo->prepare('INSERT INTO members (username, password, fullname, national_id, phone, role, marital_status, spouse_name, address, risk_status, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
                    $insStmt->execute([$username, $passwordHash, $fullname, $nationalId, $phone, $role, $maritalStatus, $spouseName, $address, $riskStatus]);
                    $imported++;
                }
            }

            $pdo->commit();
            $pdo->prepare('INSERT INTO audit_logs(user_id, action, details, ip_address) VALUES(?, ?, ?, ?)')
                ->execute([$user['id'], 'member_import', "นำเข้าสมาชิก: สำเร็จ {$imported}, อัปเดต {$updated}, ข้าม {$skipped}", $_SERVER['REMOTE_ADDR'] ?? null]);

            json_response([
                'status' => 'success',
                'message' => "นำเข้าข้อมูลสมาชิกเรียบร้อยแล้ว (เพิ่มใหม่ {$imported} ราย, อัปเดต {$updated} ราย, ข้าม {$skipped} ราย)",
                'summary' => [
                    'total' => count($rows),
                    'imported' => $imported,
                    'updated' => $updated,
                    'skipped' => $skipped,
                    'errors' => array_slice($errors, 0, 10),
                ]
            ]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            error_log('Import error: ' . $e->getMessage());
            json_response(['status' => 'error', 'message' => 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' . $e->getMessage()], 500);
        }
    }

    if ($action === 'create') {
        $d=json_input();
        $username=trim((string)($d['username']??''));
        $password=(string)($d['password']??'');
        $fullname=trim((string)($d['fullname']??''));
        if ($username==='' || $password==='' || $fullname==='') json_response(['status'=>'error','message'=>'กรุณากรอกชื่อผู้ใช้ รหัสผ่าน และชื่อ-นามสกุล'],422);
        $check=$pdo->prepare('SELECT id FROM members WHERE username=? LIMIT 1'); $check->execute([$username]);
        if ($check->fetch()) json_response(['status'=>'error','message'=>'ชื่อผู้ใช้นี้มีอยู่แล้ว กรุณาใช้ชื่อผู้ใช้อื่น'],409);
        $national=trim((string)($d['national_id']??''));
        $national = $national === '' ? null : $national;
        if ($national !== null) {
            $check=$pdo->prepare('SELECT id FROM members WHERE national_id=? LIMIT 1');
            $check->execute([$national]);
            if($check->fetch()) json_response(['status'=>'error','message'=>'เลขบัตรประชาชนนี้มีอยู่แล้วในระบบ'],409);
        }
        $requestedRole = (string)($d['role'] ?? 'member');
        $role = in_array($requestedRole, ['member','committee','president'], true) ? $requestedRole : 'member';
        $stmt=$pdo->prepare('INSERT INTO members (username,password,fullname,national_id,phone,role,marital_status,spouse_name,address) VALUES (?,?,?,?,?,?,?,?,?)');
        $stmt->execute([$username,password_hash($password,PASSWORD_DEFAULT),$fullname,$national,trim((string)($d['phone']??'')),$role,$d['marital_status']??'single',trim((string)($d['spouse_name']??'')),trim((string)($d['address']??''))]);
        $id=(int)$pdo->lastInsertId();
        try {
            $pdo->prepare('INSERT INTO audit_logs(user_id,action,details,ip_address) VALUES(?,?,?,?)')->execute([$user['id'],'member_create','สร้างสมาชิก ID '.$id,$_SERVER['REMOTE_ADDR']??null]);
        } catch (Throwable $auditError) {
            error_log('Member create audit failed: '.$auditError->getMessage());
        }
        json_response(['status'=>'success','message'=>'เพิ่มสมาชิกเรียบร้อยแล้ว','id'=>$id]);
    }

    if ($action === 'update') {
        $d=json_input(); $id=(int)($d['id']??0);
        if(!$id) json_response(['status'=>'error','message'=>'ข้อมูลสมาชิกไม่ถูกต้อง'],400);
        if (isset($d['username'])) {
            $username=trim((string)$d['username']);
            if($username==='') json_response(['status'=>'error','message'=>'ชื่อผู้ใช้ต้องไม่ว่าง'],422);
            $check=$pdo->prepare('SELECT id FROM members WHERE username=? AND id<>? LIMIT 1'); $check->execute([$username,$id]);
            if($check->fetch()) json_response(['status'=>'error','message'=>'ชื่อผู้ใช้นี้มีอยู่แล้ว กรุณาใช้ชื่อผู้ใช้อื่น'],409);
        }
        if (isset($d['national_id'])) {
            $national=trim((string)$d['national_id']);
            if ($national!=='') {
                $check=$pdo->prepare('SELECT id FROM members WHERE national_id=? AND id<>? LIMIT 1');
                $check->execute([$national,$id]);
                if($check->fetch()) json_response(['status'=>'error','message'=>'เลขบัตรประชาชนนี้มีอยู่แล้วในระบบ'],409);
            }
        }
        $fields=['username','fullname','national_id','phone','role','marital_status','spouse_name','address','risk_status','is_active']; $sets=[];$params=[];
        foreach($fields as $f){
            if(array_key_exists($f,$d)){
                $value=$d[$f];
                if($f==='national_id' && trim((string)$value)==='') $value=null;
                $sets[]="$f=?";$params[]=$value;
            }
        }
        if (!empty($d['password'])) { $sets[]='password=?';$params[]=password_hash((string)$d['password'],PASSWORD_DEFAULT); }
        if (!$sets) json_response(['status'=>'error','message'=>'ไม่มีข้อมูลสำหรับแก้ไข'],400);
        $params[]=$id; $pdo->prepare('UPDATE members SET '.implode(',',$sets).' WHERE id=?')->execute($params);
        $pdo->prepare('INSERT INTO audit_logs(user_id,action,details,ip_address) VALUES(?,?,?,?)')->execute([$user['id'],'member_update','แก้ไขสมาชิก ID '.$id,$_SERVER['REMOTE_ADDR']??null]);
        if($id===(int)$user['id']){ $s=$pdo->prepare('SELECT id,username,fullname,national_id,phone,role,marital_status,spouse_name,address,risk_status,is_active FROM members WHERE id=?');$s->execute([$id]);$_SESSION['user']=$s->fetch(); }
        json_response(['status'=>'success','message'=>'แก้ไขข้อมูลเรียบร้อยแล้ว']);
    }

    if ($action === 'delete') {
        $d=json_input(); $id=(int)($d['id']??$_POST['id']??0);
        if(!$id) json_response(['status'=>'error','message'=>'ไม่พบสมาชิก'],400);
        if($id===(int)$user['id']) json_response(['status'=>'error','message'=>'ไม่สามารถปิดใช้งานบัญชีที่กำลังใช้งานอยู่ได้'],409);
        $pdo->prepare('UPDATE members SET is_active=0 WHERE id=?')->execute([$id]);
        $pdo->prepare('INSERT INTO audit_logs(user_id,action,details,ip_address) VALUES(?,?,?,?)')->execute([$user['id'],'member_deactivate','ปิดใช้งานสมาชิก ID '.$id,$_SERVER['REMOTE_ADDR']??null]);
        json_response(['status'=>'success','message'=>'ปิดใช้งานสมาชิกเรียบร้อยแล้ว']);
    }

    json_response(['status'=>'error','message'=>'ไม่พบคำสั่ง'],400);
} catch (PDOException $e) {
    error_log($e->getMessage());
    json_response(['status'=>'error','message'=>'ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบข้อมูลซ้ำหรือข้อมูลไม่ครบถ้วน'],400);
} catch(Throwable $e){ error_log($e->getMessage()); json_response(['status'=>'error','message'=>'เกิดข้อผิดพลาดของระบบ'],500); }
