<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
$user=require_login(); $action=$_GET['action']??'list';
try{$pdo=db();
 if($action==='years'){
  $rows=$pdo->query('SELECT id,year_be,status,request_open,market_survey_done,opened_at,closed_at FROM fiscal_years ORDER BY year_be DESC')->fetchAll();
  json_response(['status'=>'success','data'=>$rows]);
 }
 if($action==='current'){
  $s=$pdo->query('SELECT id,year_be,status,request_open,market_survey_done,opened_at,closed_at FROM fiscal_years ORDER BY year_be DESC LIMIT 1');
  json_response(['status'=>'success','data'=>$s->fetch()]);
 }
 if($action==='list'){
  $fy=(int)($_GET['fiscal_year_id']??0); if(!$fy){$fy=(int)$pdo->query('SELECT id FROM fiscal_years ORDER BY year_be DESC LIMIT 1')->fetchColumn();}
  $s=$pdo->prepare('SELECT id,fiscal_year_id,category,name,description,unit,unit_price,image_file,is_active FROM catalog_items WHERE fiscal_year_id=? AND is_active=1 ORDER BY category,name');$s->execute([$fy]);
  json_response(['status'=>'success','data'=>$s->fetchAll()]);
 }
 require_role(['committee','president']);
 if($action==='create_year'){
  $d=json_input();$year=(int)($d['year_be']??0);if($year<2500||$year>2600)json_response(['status'=>'error','message'=>'ปีงบประมาณไม่ถูกต้อง'],422);
  $s=$pdo->prepare('INSERT INTO fiscal_years(year_be,status,request_open,created_by) VALUES(? ,\'open\',0,?)');$s->execute([$year,$user['id']]);json_response(['status'=>'success','message'=>'สร้างปีงบประมาณแล้ว','id'=>(int)$pdo->lastInsertId()]);
 }
 if($action==='set_request_open'){
  $d=json_input();$id=(int)($d['fiscal_year_id']??0);$open=!empty($d['request_open'])?1:0;
  $s=$pdo->prepare('SELECT status,market_survey_done FROM fiscal_years WHERE id=?');$s->execute([$id]);$fy=$s->fetch();if(!$fy)json_response(['status'=>'error','message'=>'ไม่พบปีงบประมาณ'],404);
  if($fy['status']==='closed')json_response(['status'=>'error','message'=>'ปีงบประมาณนี้ปิดแล้ว'],409);
  if($open && !(int)$fy['market_survey_done'])json_response(['status'=>'error','message'=>'กรุณาทำเครื่องหมายว่าสืบราคาตลาดประจำปีเรียบร้อยแล้วก่อนเปิดรับคำขอ'],409);
  $pdo->prepare('UPDATE fiscal_years SET request_open=?,opened_at=IF(?,COALESCE(opened_at,NOW()),opened_at) WHERE id=?')->execute([$open,$open,$id]);
  json_response(['status'=>'success','message'=>$open?'เปิดรับคำขอแล้ว':'ปิดรับคำขอแล้ว']);
 }
 if($action==='set_market_survey_done'){
  $d=json_input();$id=(int)($d['fiscal_year_id']??0);$done=!empty($d['market_survey_done'])?1:0;
  $pdo->prepare('UPDATE fiscal_years SET market_survey_done=? WHERE id=?')->execute([$done,$id]);json_response(['status'=>'success','message'=>$done?'บันทึกว่าสืบราคาตลาดประจำปีแล้ว':'ยกเลิกสถานะการสืบราคาตลาด']);
 }
 if($action==='create_item'){
  $d = isset($_FILES['image']) ? $_POST : json_input();
  $fy=(int)($d['fiscal_year_id']??0);$name=trim((string)($d['name']??''));$price=(float)($d['unit_price']??0);$unit=trim((string)($d['unit']??'รายการ'));
  if(!$fy||$name===''||$price<0)json_response(['status'=>'error','message'=>'ข้อมูลรายการไม่ครบถ้วน'],422);
  $s=$pdo->prepare('SELECT status FROM fiscal_years WHERE id=?');$s->execute([$fy]);$status=$s->fetchColumn();if($status==='closed')json_response(['status'=>'error','message'=>'ปีงบประมาณนี้ปิดแล้ว'],409);
  $imageFile=null;
  if(isset($_FILES['image'])){
   $f=$_FILES['image'];if($f['error']!==UPLOAD_ERR_OK||$f['size']>5*1024*1024)json_response(['status'=>'error','message'=>'รูปภาพไม่ถูกต้องหรือมีขนาดเกิน 5MB'],422);
   $mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);$allowed=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];if(!isset($allowed[$mime]))json_response(['status'=>'error','message'=>'รูปสินค้าต้องเป็น JPG, PNG หรือ WEBP'],422);
   $dir=__DIR__.'/../uploads/catalog';if(!is_dir($dir))mkdir($dir,0755,true);$imageFile=bin2hex(random_bytes(16)).'.'.$allowed[$mime];if(!move_uploaded_file($f['tmp_name'],$dir.'/'.$imageFile))json_response(['status'=>'error','message'=>'ไม่สามารถจัดเก็บรูปสินค้าได้'],500);
  }
  $s=$pdo->prepare('INSERT INTO catalog_items(fiscal_year_id,category,name,description,unit,unit_price,image_file,created_by) VALUES(?,?,?,?,?,?,?,?)');$s->execute([$fy,$d['category']??'fertilizer',$name,$d['description']??'',$unit,$price,$imageFile,$user['id']]);json_response(['status'=>'success','message'=>'เพิ่มรายการสำหรับปีงบประมาณแล้ว']);
 }
 if($action==='update_item'){
  $d=isset($_FILES['image'])?$_POST:json_input();$id=(int)($d['id']??0);if(!$id)json_response(['status'=>'error','message'=>'ไม่พบรายการที่ต้องการแก้ไข'],404);
  $sets=[];$p=[];foreach(['category','name','description','unit','unit_price','is_active'] as $f){if(array_key_exists($f,$d)){$sets[]="$f=?";$p[]=$d[$f];}}
  if(isset($_FILES['image'])){
   $f=$_FILES['image'];if($f['error']!==UPLOAD_ERR_OK||$f['size']>5*1024*1024)json_response(['status'=>'error','message'=>'รูปภาพไม่ถูกต้องหรือมีขนาดเกิน 5MB'],422);$mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);$allowed=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];if(!isset($allowed[$mime]))json_response(['status'=>'error','message'=>'รูปสินค้าต้องเป็น JPG, PNG หรือ WEBP'],422);$dir=__DIR__.'/../uploads/catalog';if(!is_dir($dir))mkdir($dir,0755,true);$imageFile=bin2hex(random_bytes(16)).'.'.$allowed[$mime];if(!move_uploaded_file($f['tmp_name'],$dir.'/'.$imageFile))json_response(['status'=>'error','message'=>'ไม่สามารถจัดเก็บรูปสินค้าได้'],500);$sets[]='image_file=?';$p[]=$imageFile;
  }
  if(!$sets)json_response(['status'=>'error','message'=>'ไม่มีข้อมูลแก้ไข'],422);$p[]=$id;$pdo->prepare('UPDATE catalog_items SET '.implode(',',$sets).' WHERE id=?')->execute($p);json_response(['status'=>'success','message'=>'แก้ไขรายการแล้ว']);
 }
 if($action==='close_year'){
  $d=json_input();$id=(int)($d['fiscal_year_id']??0);$pdo->prepare("UPDATE fiscal_years SET status='closed',request_open=0,closed_at=NOW() WHERE id=?")->execute([$id]);json_response(['status'=>'success','message'=>'ปิดปีงบประมาณและปิดรับคำขอแล้ว']);
 }
 json_response(['status'=>'error','message'=>'ไม่พบคำสั่ง'],400);
}catch(PDOException $e){error_log($e->getMessage());json_response(['status'=>'error','message'=>'ข้อมูลซ้ำหรือไม่ถูกต้อง'],400);}catch(Throwable $e){error_log($e->getMessage());json_response(['status'=>'error','message'=>'เกิดข้อผิดพลาดของระบบ'],500);}
