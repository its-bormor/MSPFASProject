<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
$user=require_login();$action=$_GET['action']??'list';
function payAudit(PDO $pdo,array $user,string $action,string $details,?int $memberId=null):void{$pdo->prepare('INSERT INTO audit_logs(user_id,acting_for_member_id,action,details,ip_address) VALUES(?,?,?,?,?)')->execute([$user['id'],$memberId,$action,$details,$_SERVER['REMOTE_ADDR']??null]);}
function refreshLoanState(PDO $pdo,int $requestId):void{
 $s=$pdo->prepare("SELECT COALESCE(SUM(amount),0) FROM payments WHERE request_id=? AND status='verified'");$s->execute([$requestId]);$paid=(float)$s->fetchColumn();
 $s=$pdo->prepare('SELECT id,total_payable FROM installment_plans WHERE request_id=? LIMIT 1');$s->execute([$requestId]);$plan=$s->fetch();if(!$plan)return;
 $remaining=$paid;$s=$pdo->prepare('SELECT id,amount_due FROM installments WHERE plan_id=? ORDER BY installment_no');$s->execute([$plan['id']]);foreach($s->fetchAll() as $inst){$due=(float)$inst['amount_due'];$status=$remaining>=$due?'paid':($remaining>0?'partial':'pending');$remaining=max(0,$remaining-$due);$pdo->prepare('UPDATE installments SET status=? WHERE id=?')->execute([$status,$inst['id']]);}
 $status=$paid>=(float)$plan['total_payable']?'completed':'active';$pdo->prepare('UPDATE requests SET status=? WHERE id=? AND status IN (\'member_confirmed\',\'active\',\'completed\')')->execute([$status,$requestId]);
}
try{$pdo=db();
 if($action==='list'){
  $sql='SELECT p.*,r.amount_requested,m.id member_id,m.fullname FROM payments p JOIN requests r ON r.id=p.request_id JOIN members m ON m.id=r.member_id';$p=[];
  if($user['role']==='member'){$sql.=' WHERE r.member_id=?';$p[]=$user['id'];}elseif(!empty($_GET['member_id'])){$sql.=' WHERE r.member_id=?';$p[]=(int)$_GET['member_id'];}
  $sql.=' ORDER BY p.payment_date DESC,p.id DESC';$s=$pdo->prepare($sql);$s->execute($p);json_response(['status'=>'success','data'=>$s->fetchAll()]);
 }
 if($action==='summary'){
  $memberId=$user['role']==='member'?(int)$user['id']:(int)($_GET['member_id']??0);if(!$memberId)json_response(['status'=>'error','message'=>'กรุณาเลือกสมาชิก'],422);$s=$pdo->prepare('SELECT COALESCE(SUM(p.amount),0) paid FROM payments p JOIN requests r ON r.id=p.request_id WHERE r.member_id=? AND p.status=\'verified\'');$s->execute([$memberId]);$paid=(float)$s->fetchColumn();$s=$pdo->prepare('SELECT COALESCE(SUM(ip.total_payable),0) total FROM installment_plans ip JOIN requests r ON r.id=ip.request_id WHERE r.member_id=? AND r.status IN (\'member_confirmed\',\'active\',\'completed\')');$s->execute([$memberId]);$total=(float)$s->fetchColumn();json_response(['status'=>'success','data'=>['total'=>$total,'paid'=>$paid,'remaining'=>max(0,$total-$paid)]]);
 }
 if($action==='submit'){
  if($user['role']==='member')$memberId=(int)$user['id'];else{$memberId=(int)($_POST['member_id']??0);require_role(['committee']);}
  $request=(int)($_POST['request_id']??0);$amount=(float)($_POST['amount']??0);$channel=in_array($_POST['payment_channel']??'transfer',['transfer','cash'],true)?$_POST['payment_channel']:'transfer';
  $s=$pdo->prepare('SELECT r.id,r.member_id,r.status FROM requests r WHERE r.id=? AND r.member_id=?');$s->execute([$request,$memberId]);$r=$s->fetch();if(!$r)json_response(['status'=>'error','message'=>'ไม่พบคำขอของสมาชิก'],404);if(!in_array($r['status'],['member_confirmed','active'],true))json_response(['status'=>'error','message'=>'คำขอนี้ยังไม่พร้อมสำหรับการชำระคืน'],409);if($amount<=0)json_response(['status'=>'error','message'=>'จำนวนเงินต้องมากกว่า 0'],422);
  $slipName=null;if($channel==='transfer'){
   if(!isset($_FILES['slip']))json_response(['status'=>'error','message'=>'กรุณาแนบหลักฐานการโอนเงิน'],422);$f=$_FILES['slip'];if($f['error']!==UPLOAD_ERR_OK||$f['size']>5*1024*1024)json_response(['status'=>'error','message'=>'ไฟล์ไม่ถูกต้องหรือมีขนาดเกิน 5MB'],422);$allowed=['image/jpeg','image/png','application/pdf'];$mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);if(!in_array($mime,$allowed,true))json_response(['status'=>'error','message'=>'หลักฐานต้องเป็น JPG, PNG หรือ PDF'],422);$dir=__DIR__.'/../uploads/slips';if(!is_dir($dir))mkdir($dir,0755,true);$ext=strtolower(pathinfo($f['name'],PATHINFO_EXTENSION));$slipName=bin2hex(random_bytes(16)).'.'.$ext;if(!move_uploaded_file($f['tmp_name'],$dir.'/'.$slipName))json_response(['status'=>'error','message'=>'ไม่สามารถจัดเก็บหลักฐานได้'],500);
  }
  $status=$channel==='cash'?'verified':'pending';$s=$pdo->prepare('INSERT INTO payments(request_id,amount,payment_type,payment_channel,payment_date,slip_file,status,recorded_by,verified_by,verified_at,note) VALUES(?,?,?,?,?,?,?,?,?,?,?)');$s->execute([$request,$amount,'installment',$channel,$_POST['payment_date']??date('Y-m-d'),$slipName,$status,$user['id'],$channel==='cash'?$user['id']:null,$channel==='cash'?date('Y-m-d H:i:s'):null,$channel==='cash'?'รับชำระเงินสดโดยคณะกรรมการ':'รอตรวจสอบหลักฐาน']);
  $newPaymentId=(int)$pdo->lastInsertId();if($status==='verified'){$receipt='RC-'.date('Ymd').'-'.str_pad((string)$newPaymentId,5,'0',STR_PAD_LEFT);$pdo->prepare('UPDATE payments SET receipt_number=? WHERE id=?')->execute([$receipt,$newPaymentId]);refreshLoanState($pdo,$request);}payAudit($pdo,$user,'payment_record','บันทึกชำระ #'.$newPaymentId.' จำนวน '.number_format($amount,2).' บาท',$memberId);json_response(['status'=>'success','message'=>$channel==='cash'?'บันทึกการรับเงินสดและออกหลักฐานได้แล้ว':'ส่งหลักฐานการชำระเงินเพื่อรอตรวจสอบแล้ว']);
 }
 if($action==='verify'){
  require_role(['committee']);$d=json_input();$id=(int)($d['id']??0);$status=in_array($d['status']??'', ['verified','invalid'],true)?$d['status']:'invalid';$s=$pdo->prepare('SELECT p.id,p.request_id,r.member_id FROM payments p JOIN requests r ON r.id=p.request_id WHERE p.id=?');$s->execute([$id]);$r=$s->fetch();if(!$r)json_response(['status'=>'error','message'=>'ไม่พบรายการชำระเงิน'],404);$pdo->prepare('UPDATE payments SET status=?,verified_by=?,verified_at=NOW(),note=? WHERE id=?')->execute([$status,$user['id'],$d['note']??'',$id]);if($status==='verified'){ $receipt='RC-'.date('Ymd').'-'.str_pad((string)$id,5,'0',STR_PAD_LEFT);$pdo->prepare('UPDATE payments SET receipt_number=? WHERE id=?')->execute([$receipt,$id]);refreshLoanState($pdo,(int)$r['request_id']); }payAudit($pdo,$user,'payment_verify','ตรวจสอบการชำระ #'.$id.' : '.$status,(int)$r['member_id']);json_response(['status'=>'success','message'=>$status==='verified'?'ยืนยันการชำระเงินแล้ว':'ตีกลับหลักฐานการชำระเงินแล้ว']);
 }
 if($action==='receipt'){
  $id=(int)($_GET['id']??0);$s=$pdo->prepare('SELECT p.*,r.member_id,m.fullname,r.amount_requested FROM payments p JOIN requests r ON r.id=p.request_id JOIN members m ON m.id=r.member_id WHERE p.id=?');$s->execute([$id]);$r=$s->fetch();if(!$r)json_response(['status'=>'error','message'=>'ไม่พบหลักฐาน'],404);if($user['role']==='member'&&(int)$r['member_id']!==(int)$user['id'])json_response(['status'=>'error','message'=>'ไม่มีสิทธิ์'],403);json_response(['status'=>'success','data'=>$r]);
 }
 if($action==='ledger'){
  require_role(['committee','president']);$year=(int)($_GET['year']??(date('Y')+543));$greg=$year-543;$s=$pdo->prepare('SELECT id,transaction_date,type,description,amount,reference FROM ledger WHERE YEAR(transaction_date)=? ORDER BY transaction_date DESC,id DESC');$s->execute([$greg]);$data=$s->fetchAll();$income=0;$expense=0;foreach($data as $r){if($r['type']==='income')$income+=(float)$r['amount'];else$expense+=(float)$r['amount'];}json_response(['status'=>'success','data'=>$data,'total_income'=>$income,'total_expense'=>$expense,'balance'=>$income-$expense,'year'=>$year]);
 }
 if($action==='add_transaction'){
  require_role(['committee']);$d=json_input();$type=in_array($d['type']??'', ['income','expense'],true)?$d['type']:'income';$amount=(float)($d['amount']??0);if($amount<=0)json_response(['status'=>'error','message'=>'จำนวนเงินต้องมากกว่า 0'],422);$s=$pdo->prepare('INSERT INTO ledger(transaction_date,type,description,amount,reference,created_by) VALUES(?,?,?,?,?,?)');$s->execute([$d['transaction_date']??date('Y-m-d'),$type,trim((string)($d['description']??'')),$amount,$d['reference']??'',$user['id']]);payAudit($pdo,$user,'ledger_record','บันทึกรายการ '.$type.' '.number_format($amount,2).' บาท');json_response(['status'=>'success','message'=>'บันทึกรายการบัญชีเรียบร้อยแล้ว']);
 }
 json_response(['status'=>'error','message'=>'ไม่พบคำสั่ง'],400);
}catch(Throwable $e){error_log($e->getMessage());json_response(['status'=>'error','message'=>'เกิดข้อผิดพลาดของระบบ'],500);}
