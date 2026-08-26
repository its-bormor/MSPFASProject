<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
$pdo=db();
$username='admin';
$password=getenv('DEV_ADMIN_PASSWORD');
if(!$password){fwrite(STDERR,"Set DEV_ADMIN_PASSWORD before running this script.\n");exit(1);}
$hash=password_hash($password,PASSWORD_DEFAULT);
$stmt=$pdo->prepare('SELECT id FROM members WHERE username=? LIMIT 1');
$stmt->execute([$username]);
$id=$stmt->fetchColumn();
if($id){$pdo->prepare('UPDATE members SET password=?,role=?,is_active=1 WHERE id=?')->execute([$hash,'president',$id]);echo "Admin account updated.\n";}
else{$pdo->prepare('INSERT INTO members (username,password,fullname,phone,role,marital_status,address) VALUES (?,?,?,?,?,?,?)')->execute([$username,$hash,'ผู้ดูแลระบบ','0000000000','president','single','บ้านแม่ยางตาล']);echo "Admin account created.\n";}
