<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
$pdo=db();
$cols=$pdo->query('SHOW COLUMNS FROM members')->fetchAll();
$names=array_column($cols,'Field');
if(!in_array('national_id',$names,true)) $pdo->exec('ALTER TABLE members ADD COLUMN national_id VARCHAR(13) NULL AFTER fullname');
$indexes=$pdo->query('SHOW INDEX FROM members')->fetchAll();
$has=false; foreach($indexes as $i) if(($i['Key_name']??'')==='uq_members_national_id'){$has=true;break;}
if(!$has) $pdo->exec('ALTER TABLE members ADD UNIQUE KEY uq_members_national_id (national_id)');
echo "Database migration complete.\n";
