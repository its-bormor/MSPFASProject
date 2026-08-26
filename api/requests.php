<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
$user=require_login(); $action=$_GET['action']??'list';

function actingMember(PDO $pdo, array $user, ?int $requestedId): int {
    if($user['role']==='member') return (int)$user['id'];
    $id=(int)$requestedId; if(!$id) json_response(['status'=>'error','message'=>'กรุณาเลือกสมาชิกที่ต้องการดำเนินการแทน'],422);
    $s=$pdo->prepare('SELECT id FROM members WHERE id=? AND role=\'member\' AND is_active=1');$s->execute([$id]);if(!$s->fetch())json_response(['status'=>'error','message'=>'ไม่พบสมาชิกที่ใช้งานได้'],404);return $id;
}
function requestAudit(PDO $pdo,array $user,string $action,string $details,?int $actingFor=null):void{
 $pdo->prepare('INSERT INTO audit_logs(user_id,acting_for_member_id,action,details,ip_address) VALUES(?,?,?,?,?)')->execute([$user['id'],$actingFor,$action,$details,$_SERVER['REMOTE_ADDR']??null]);
}
try{$pdo=db();
 if($action==='list'){
  $sql='SELECT r.id,r.fiscal_year_id,r.member_id,r.amount_requested,r.interest_rate,r.purpose,r.status,r.committee_status,r.president_status,r.revision_note,r.created_at,m.fullname,m.phone,fy.year_be FROM requests r JOIN members m ON m.id=r.member_id LEFT JOIN fiscal_years fy ON fy.id=r.fiscal_year_id';$p=[];
  if($user['role']==='member'){$sql.=' WHERE r.member_id=?';$p[]=$user['id'];}
  elseif(!empty($_GET['member_id'])){$sql.=' WHERE r.member_id=?';$p[]=(int)$_GET['member_id'];}
  if(!empty($_GET['status'])){$sql.=strpos($sql,' WHERE ')!==false?' AND ':' WHERE ';$sql.=' r.status=?';$p[]=$_GET['status'];}
  $sql.=' ORDER BY r.created_at DESC';$s=$pdo->prepare($sql);$s->execute($p);json_response(['status'=>'success','data'=>$s->fetchAll()]);
 }
 if($action==='detail'){
  $id=(int)($_GET['id']??0);$s=$pdo->prepare('SELECT r.*,m.fullname member_name,m.phone,m.address,m.marital_status,m.spouse_name,fy.year_be FROM requests r JOIN members m ON m.id=r.member_id LEFT JOIN fiscal_years fy ON fy.id=r.fiscal_year_id WHERE r.id=?');$s->execute([$id]);$r=$s->fetch();if(!$r)json_response(['status'=>'error','message'=>'ไม่พบคำขอ'],404);if($user['role']==='member'&&(int)$r['member_id']!==(int)$user['id'])json_response(['status'=>'error','message'=>'ไม่มีสิทธิ์เข้าถึง'],403);
  $s=$pdo->prepare('SELECT id,catalog_item_id,item_name_snapshot,unit_snapshot,unit_price_snapshot,quantity,line_total FROM request_items WHERE request_id=? ORDER BY id');$s->execute([$id]);$r['items']=$s->fetchAll();
  $s=$pdo->prepare('SELECT guarantor_no,fullname,national_id,phone,address FROM request_guarantors WHERE request_id=? ORDER BY guarantor_no');$s->execute([$id]);$r['guarantors']=$s->fetchAll();
  $s=$pdo->prepare('SELECT document_type,file_name,status,note FROM request_documents WHERE request_id=? ORDER BY id');$s->execute([$id]);$r['documents']=$s->fetchAll();
  $s=$pdo->prepare('SELECT * FROM installment_plans WHERE request_id=? LIMIT 1');$s->execute([$id]);$r['payment_plan']=$s->fetch()?:null;
  if($r['payment_plan']){$s=$pdo->prepare('SELECT * FROM installments WHERE plan_id=? ORDER BY installment_no');$s->execute([$r['payment_plan']['id']]);$r['installments']=$s->fetchAll();}else$r['installments']=[];
  json_response(['status'=>'success','data'=>$r]);
 }
 if($action==='create'){
  $d=json_input();$memberId=actingMember($pdo,$user,isset($d['member_id'])?(int)$d['member_id']:null);
  $s=$pdo->prepare('SELECT id,request_open,status FROM fiscal_years WHERE id=?');$fyId=(int)($d['fiscal_year_id']??0);if(!$fyId){$s=$pdo->query('SELECT id,request_open,status FROM fiscal_years ORDER BY year_be DESC LIMIT 1');$fy=$s->fetch();}else{$s->execute([$fyId]);$fy=$s->fetch();}
  if(!$fy||!(int)$fy['request_open']||$fy['status']!=='open')json_response(['status'=>'error','message'=>'ขณะนี้ยังไม่เปิดรับคำขอสำหรับปีงบประมาณนี้'],409);$fyId=(int)$fy['id'];
  $ms=$pdo->prepare('SELECT risk_status FROM members WHERE id=?');$ms->execute([$memberId]);$member=$ms->fetch();if(!$member||$member['risk_status']!=='normal')json_response(['status'=>'error','message'=>'สมาชิกสถานะนี้ไม่สามารถยื่นคำขอได้'],403);
  $items=$d['items']??[];if(!is_array($items)||count($items)<1)json_response(['status'=>'error','message'=>'กรุณาเลือกรายการอย่างน้อย 1 รายการ'],422);
  $total=0;$validated=[];
  foreach($items as $item){$cid=(int)($item['catalog_item_id']??0);$qty=(float)($item['quantity']??0);if(!$cid||$qty<=0)continue;$s=$pdo->prepare('SELECT id,name,unit,unit_price FROM catalog_items WHERE id=? AND fiscal_year_id=? AND is_active=1');$s->execute([$cid,$fyId]);$row=$s->fetch();if(!$row)json_response(['status'=>'error','message'=>'มีรายการที่ไม่อยู่ในบัญชีโครงการ'],422);$line=$qty*(float)$row['unit_price'];$total+=$line;$validated[]=['row'=>$row,'qty'=>$qty,'line'=>$line];}
  if(!$validated)json_response(['status'=>'error','message'=>'ไม่พบรายการที่เลือก'],422);if($total<10000||$total>65000)json_response(['status'=>'error','message'=>'ยอดคำขอต้องอยู่ระหว่าง 10,000 ถึง 65,000 บาท'],422);
  $purpose=trim((string)($d['purpose']??''));if($purpose==='')json_response(['status'=>'error','message'=>'กรุณาระบุวัตถุประสงค์'],422);
  $pdo->beginTransaction();
  $s=$pdo->prepare("INSERT INTO requests(member_id,fiscal_year_id,amount_requested,interest_rate,purpose,status,committee_status,president_status,checklist_documents) VALUES(?,?,?,?,?,'submitted','pending','pending',?)");$s->execute([$memberId,$fyId,$total,6,$purpose,json_encode($d['checklist_documents']??[],JSON_UNESCAPED_UNICODE)]);$requestId=(int)$pdo->lastInsertId();
  foreach($validated as $v){$r=$v['row'];$pdo->prepare('INSERT INTO request_items(request_id,catalog_item_id,item_name_snapshot,unit_snapshot,unit_price_snapshot,quantity,line_total) VALUES(?,?,?,?,?,?,?)')->execute([$requestId,$r['id'],$r['name'],$r['unit'],$r['unit_price'],$v['qty'],$v['line']]);}
  foreach(array_values($d['guarantors']??[]) as $i=>$g){if($i>=3)break;if(trim((string)($g['fullname']??''))!=='')$pdo->prepare('INSERT INTO request_guarantors(request_id,guarantor_no,fullname,national_id,phone,address) VALUES(?,?,?,?,?,?)')->execute([$requestId,$i+1,trim($g['fullname']),trim((string)($g['national_id']??'')),trim((string)($g['phone']??'')),trim((string)($g['address']??''))]);}
  $pdo->commit();requestAudit($pdo,$user,'request_create','สร้างคำขอ #'.$requestId,$user['role']==='member'?null:$memberId);json_response(['status'=>'success','message'=>'ส่งคำขอเรียบร้อยแล้ว','id'=>$requestId]);
 }
 if($action==='committee_decision'){
  require_role(['committee']);$d=json_input();$id=(int)($d['id']??0);$decision=$d['decision']??'';$note=trim((string)($d['note']??''));$s=$pdo->prepare('SELECT * FROM requests WHERE id=?');$s->execute([$id]);$r=$s->fetch();if(!$r)json_response(['status'=>'error','message'=>'ไม่พบคำขอ'],404);if($r['status']!=='submitted'&&$r['status']!=='committee_review')json_response(['status'=>'error','message'=>'คำขอนี้ไม่อยู่ในขั้นตอนตรวจสอบของคณะกรรมการ'],409);$status=$decision==='approve'?'president_review':'revision_requested';$pdo->prepare('UPDATE requests SET status=?,committee_status=?,committee_note=?,committee_by=?,committee_at=NOW(),revision_note=? WHERE id=?')->execute([$status,$decision==='approve'?'approved':'rejected',$note,$user['id'],$decision==='approve'?null:$note,$id]);requestAudit($pdo,$user,'committee_decision','คำขอ #'.$id.' : '.$decision);json_response(['status'=>'success','message'=>$decision==='approve'?'ส่งต่อประธานพิจารณาแล้ว':'ส่งคำขอกลับให้แก้ไขแล้ว']);
 }
 if($action==='president_decision'){
  require_role(['president']);$d=json_input();$id=(int)($d['id']??0);$decision=$d['decision']??'';$note=trim((string)($d['note']??''));$s=$pdo->prepare('SELECT * FROM requests WHERE id=?');$s->execute([$id]);$r=$s->fetch();if(!$r)json_response(['status'=>'error','message'=>'ไม่พบคำขอ'],404);if($r['status']!=='president_review')json_response(['status'=>'error','message'=>'คำขอยังไม่อยู่ในขั้นตอนพิจารณาของประธาน'],409);
  $status=$decision==='approve'?'contract_pending':'revision_requested';$pdo->prepare('UPDATE requests SET status=?,president_status=?,president_note=?,president_by=?,president_at=NOW(),revision_note=? WHERE id=?')->execute([$status,$decision==='approve'?'approved':'rejected',$note,$user['id'],$decision==='approve'?null:$note,$id]);requestAudit($pdo,$user,'president_decision','คำขอ #'.$id.' : '.$decision);json_response(['status'=>'success','message'=>$decision==='approve'?'อนุมัติแล้ว เข้าสู่ขั้นตอนจัดทำสัญญา':'ส่งกลับให้แก้ไขแล้ว']);
 }
 if($action==='confirm_contract'){
  if($user['role']==='member')$memberId=(int)$user['id'];else{$memberId=(int)($_GET['member_id']??0);require_role(['committee','president']);}
  $d=json_input();$id=(int)($d['id']??0);$s=$pdo->prepare('SELECT * FROM requests WHERE id=? AND member_id=?');$s->execute([$id,$memberId]);$r=$s->fetch();if(!$r)json_response(['status'=>'error','message'=>'ไม่พบคำขอของสมาชิก'],404);if($r['status']!=='contract_pending')json_response(['status'=>'error','message'=>'คำขอยังไม่พร้อมให้ยืนยันสัญญา'],409);
  $mode=($d['payment_mode']??'installment')==='lump_sum'?'lump_sum':'installment';$count=$mode==='installment'?max(1,min(60,(int)($d['installment_count']??1))):1;$principal=(float)$r['amount_requested'];$rate=6;$interest=round($principal*$rate/100,2);$risk=(float)($d['risk_deduction']??0);if($risk<0||$risk>$principal)json_response(['status'=>'error','message'=>'เงินค้ำประกันความเสี่ยงต้องไม่เกินเงินต้น'],422);$total=max(0,$principal+$interest-$risk);if($total<=0)json_response(['status'=>'error','message'=>'ยอดที่ต้องชำระต้องมากกว่า 0'],422);$first=$d['first_due_date']??date('Y-m-d');
  $pdo->beginTransaction();$pdo->prepare('INSERT INTO installment_plans(request_id,payment_mode,installment_count,principal_amount,interest_rate,interest_amount,risk_deduction,total_payable,first_due_date) VALUES(?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE payment_mode=VALUES(payment_mode),installment_count=VALUES(installment_count),principal_amount=VALUES(principal_amount),interest_rate=VALUES(interest_rate),interest_amount=VALUES(interest_amount),risk_deduction=VALUES(risk_deduction),total_payable=VALUES(total_payable),first_due_date=VALUES(first_due_date)')->execute([$id,$mode,$count,$principal,$rate,$interest,$risk,$total,$first]);$planId=(int)$pdo->lastInsertId();if(!$planId){$s=$pdo->prepare('SELECT id FROM installment_plans WHERE request_id=?');$s->execute([$id]);$planId=(int)$s->fetchColumn();$pdo->prepare('DELETE FROM installments WHERE plan_id=?')->execute([$planId]);}
  $base=round($total/$count,2);$sum=0;for($i=1;$i<=$count;$i++){ $amt=$i===$count?round($total-$sum,2):$base;$sum+=$amt;$due=date('Y-m-d',strtotime($first.' +'.(($i-1)*30).' days'));$pdo->prepare('INSERT INTO installments(plan_id,installment_no,due_date,principal_due,interest_due,amount_due) VALUES(?,?,?,?,?,?)')->execute([$planId,$i,$due,round($amt*($principal/$total),2),round($amt*($interest/$total),2),$amt]); }
  $pdo->prepare("UPDATE requests SET status='member_confirmed',contract_confirmed_at=NOW(),contract_confirmed_by=?,revision_note=NULL WHERE id=?")->execute([$user['id'],$id]);$pdo->commit();requestAudit($pdo,$user,'contract_confirm','ยืนยันสัญญา #'.$id,$user['role']==='member'?null:$memberId);json_response(['status'=>'success','message'=>'ยืนยันสัญญาและแผนการชำระเรียบร้อยแล้ว']);
 }
 if($action==='revise'){
  $d=json_input();$id=(int)($d['id']??0);$memberId=actingMember($pdo,$user,isset($d['member_id'])?(int)$d['member_id']:null);$s=$pdo->prepare('SELECT status FROM requests WHERE id=? AND member_id=?');$s->execute([$id,$memberId]);$r=$s->fetch();if(!$r)json_response(['status'=>'error','message'=>'ไม่พบคำขอ'],404);if($r['status']!=='revision_requested')json_response(['status'=>'error','message'=>'คำขอนี้ยังไม่อยู่ในขั้นตอนแก้ไข'],409);$pdo->prepare("UPDATE requests SET status='submitted',committee_status='pending',president_status='pending',revision_note=NULL WHERE id=?")->execute([$id]);requestAudit($pdo,$user,'request_revise','ส่งคำขอ #'.$id.' กลับเข้ากระบวนการตรวจสอบ',$user['role']==='member'?null:$memberId);json_response(['status'=>'success','message'=>'ส่งคำขอที่แก้ไขแล้วกลับเข้าสู่การพิจารณา']);
 }
 json_response(['status'=>'error','message'=>'ไม่พบคำสั่ง'],400);
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();error_log($e->getMessage());json_response(['status'=>'error','message'=>'เกิดข้อผิดพลาดของระบบ'],500);}
