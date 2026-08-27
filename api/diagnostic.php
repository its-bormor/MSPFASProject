<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
header('Content-Type: application/json; charset=utf-8');
try {
 load_local_env();
 $keys=['DB_HOST','DB_NAME','DB_USER','DB_PASS','DB_PORT']; $present=[]; foreach($keys as $k){$v=getenv($k);$present[$k]=($v!==false&&$v!=='');}
 $env_file = getenv('DB_ENV_FILE');
 if (!$env_file) {
     $render_secret = '/etc/secrets/.env';
     $env_file = is_file($render_secret) ? $render_secret : (__DIR__.'/../config/.env');
 }
 $runtime_file = __DIR__ . '/../config/runtime.php';
 $runtime_debug = ['file'=>$runtime_file,'exists'=>is_file($runtime_file),'readable'=>is_readable($runtime_file),'size'=>is_file($runtime_file)?filesize($runtime_file):null];
 $env_debug=['file'=>$env_file,'exists'=>is_file($env_file),'readable'=>is_readable($env_file),'size'=>is_file($env_file)?filesize($env_file):null,'mtime'=>is_file($env_file)?filemtime($env_file):null];
 if (is_file($env_file) && is_readable($env_file)) {
     $parsed=parse_ini_file($env_file,false,INI_SCANNER_RAW);
     $env_debug['parse_ok']=is_array($parsed);
     $env_debug['keys']=is_array($parsed)?array_values(array_filter(array_keys($parsed),'is_string')):[];
 }
 try { db(); echo json_encode(['status'=>'success','db'=>'connected','env'=>$present,'runtime_debug'=>$runtime_debug,'env_debug'=>$env_debug],JSON_UNESCAPED_UNICODE); } catch(Throwable $e){ $msg=preg_replace('/password|passwd|pwd/i','[REDACTED]',$e->getMessage()); http_response_code(500); echo json_encode(['status'=>'error','db'=>'failed','env'=>$present,'runtime_debug'=>$runtime_debug,'env_debug'=>$env_debug,'error'=>$msg],JSON_UNESCAPED_UNICODE); }
} catch(Throwable $e){http_response_code(500); echo json_encode(['status'=>'error','error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);}
