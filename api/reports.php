<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';
$user=require_role(['committee','president']);$action=$_GET['action']??'annual';
try{$pdo=db();
 if($action==='annual'){
  $year=(int)($_GET['year']??(date('Y')+543));$s=$pdo->prepare('SELECT id FROM fiscal_years WHERE year_be=?');$s->execute([$year]);$fy=$s->fetch();if(!$fy)json_response(['status'=>'error','message'=>'ไม่พบปีงบประมาณ'],404);$id=(int)$fy['id'];
  $q=$pdo->prepare('SELECT COUNT(*) total, SUM(status IN (\'member_confirmed\',\'active\',\'completed\',\'contract_pending\')) approved, SUM(status IN (\'committee_rejected\',\'president_rejected\')) rejected, COALESCE(SUM(amount_requested),0) requested_amount FROM requests WHERE fiscal_year_id=?');$q->execute([$id]);$summary=$q->fetch();
  $q=$pdo->prepare('SELECT COALESCE(SUM(p.amount),0) paid FROM payments p JOIN requests r ON r.id=p.request_id WHERE r.fiscal_year_id=? AND p.status=\'verified\'');$q->execute([$id]);$paid=(float)$q->fetchColumn();
  $q=$pdo->prepare('SELECT COALESCE(SUM(ip.total_payable),0) payable FROM installment_plans ip JOIN requests r ON r.id=ip.request_id WHERE r.fiscal_year_id=?');$q->execute([$id]);$payable=(float)$q->fetchColumn();
  $q=$pdo->prepare('SELECT c.category,COUNT(ri.id) lines,COALESCE(SUM(ri.quantity),0) quantity,COALESCE(SUM(ri.line_total),0) amount FROM request_items ri JOIN requests r ON r.id=ri.request_id JOIN catalog_items c ON c.id=ri.catalog_item_id WHERE r.fiscal_year_id=? GROUP BY c.category');$q->execute([$id]);$byCategory=$q->fetchAll();
  $q=$pdo->prepare('SELECT type,COALESCE(SUM(amount),0) amount FROM ledger WHERE YEAR(transaction_date)=? GROUP BY type');$q->execute([$year-543]);$ledger=$q->fetchAll();
  json_response(['status'=>'success','year'=>$year,'summary'=>$summary,'paid'=>$paid,'payable'=>$payable,'remaining'=>max(0,$payable-$paid),'by_category'=>$byCategory,'ledger'=>$ledger]);
 }
 if($action==='member_history'){
  $memberId=(int)($_GET['member_id']??0);if($user['role']==='member')$memberId=(int)$user['id'];if(!$memberId)json_response(['status'=>'error','message'=>'กรุณาเลือกสมาชิก'],422);
  $s=$pdo->prepare('SELECT id,year_be,status,request_open FROM fiscal_years ORDER BY year_be DESC');$s->execute();$years=$s->fetchAll();$out=[];foreach($years as $y){$q=$pdo->prepare('SELECT COUNT(*) requests,COALESCE(SUM(amount_requested),0) requested FROM requests WHERE member_id=? AND fiscal_year_id=?');$q->execute([$memberId,$y['id']]);$r=$q->fetch();$out[]=['year'=>$y['year_be'],'requests'=>(int)$r['requests'],'requested'=>(float)$r['requested']];}json_response(['status'=>'success','data'=>$out]);
 }
 json_response(['status'=>'error','message'=>'ไม่พบคำสั่ง'],400);
}catch(Throwable $e){error_log($e->getMessage());json_response(['status'=>'error','message'=>'ไม่สามารถสร้างรายงานได้'],500);}
