<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
header('Content-Type: application/json; charset=utf-8');
try {
 load_local_env();
 $keys=['DB_HOST','DB_NAME','DB_USER','DB_PASS','DB_PORT']; $present=[]; foreach($keys as $k){$v=getenv($k);$present[$k]=($v!==false&&$v!=='');}
 try { db(); echo json_encode(['status'=>'success','db'=>'connected','env'=>$present],JSON_UNESCAPED_UNICODE); } catch(Throwable $e){ $msg=preg_replace('/password|passwd|pwd/i','[REDACTED]',$e->getMessage()); http_response_code(500); echo json_encode(['status'=>'error','db'=>'failed','env'=>$present,'error'=>$msg],JSON_UNESCAPED_UNICODE); }
} catch(Throwable $e){http_response_code(500); echo json_encode(['status'=>'error','error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);}
