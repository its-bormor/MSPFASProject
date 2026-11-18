// @ts-nocheck
// @ts-nocheck
const state={user:null,view:'',stationMember:null,requests:[],members:[],payments:[],catalog:[],fiscalYear:null,years:[]};
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=v=>Number(v||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const icon=n=>`<i class="bi bi-${n}" aria-hidden="true"></i>`;
const roleText=r=>r==='president'?'ประธานกองทุน':r==='committee'?'คณะกรรมการ':'สมาชิกกองทุน';
const maritalMap={single:'โสด',married:'สมรส',widowed:'หม้าย',divorced:'หย่าร้าง','โสด':'โสด','สมรส':'สมรส','หม้าย':'หม้าย','หย่า':'หย่าร้าง','หย่าร้าง':'หย่าร้าง'};
const maritalText=m=>{if(!m)return '-';const k=String(m).trim().toLowerCase();return maritalMap[k]||m;};
const statusMap={submitted:['รอตรวจสอบ','warning'],committee_review:['คณะกรรมการกำลังตรวจสอบ','warning'],committee_rejected:['ไม่ผ่านการตรวจสอบ','danger'],president_review:['รอประธานพิจารณา','info'],president_rejected:['ไม่ผ่านการอนุมัติ','danger'],contract_pending:['รอยืนยันสัญญา','info'],member_confirmed:['ยืนยันสัญญาแล้ว','success'],active:['อยู่ระหว่างชำระคืน','success'],completed:['ชำระครบแล้ว','success'],revision_requested:['รอแก้ไขคำขอ','danger'],draft:['แบบร่าง','neutral']};
function badge(s){const x=statusMap[s]||[s||'-','neutral'];return `<span class="badge badge-${x[1]}">${esc(x[0])}</span>`}
async function api(url,opt={}){try{const r=await fetch(url,opt);const raw=await r.text();let j=null;try{j=raw?JSON.parse(raw):null}catch(parseError){console.error('API returned non-JSON',r.status,raw);showNotice('เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง', 'error', `HTTP ${r.status}${raw?`<br><small>${esc(raw.slice(0,300))}</small>`:''}`);return null}if(!j){showNotice('ไม่สามารถรับข้อมูลจากเซิร์ฟเวอร์ได้','error');return null}if(j.status==='error'){showNotice(j.message||'เกิดข้อผิดพลาด','error');return null}if(j.message) showNotice(j.message,'success');return j}catch(e){console.error(e);showNotice('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้','error');return null}}
function showNotice(title,type='success',detail=''){const old=document.getElementById('floating-notice');if(old)old.remove();const el=document.createElement('div');el.id='floating-notice';el.className=`floating-notice floating-notice-${type}`;const ico=type==='error'?'exclamation-triangle':type==='warning'?'exclamation-circle':'check-circle';el.innerHTML=`<div class="floating-notice-icon"><i class="bi bi-${ico}"></i></div><div class="floating-notice-content"><strong>${esc(title)}</strong>${detail?`<div class="floating-notice-detail">${detail}</div>`:''}</div><button type="button" class="floating-notice-close" aria-label="ปิด" onclick="this.parentElement.remove()"><i class="bi bi-x-lg"></i></button>`;document.body.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));setTimeout(()=>{if(el.isConnected){el.classList.remove('show');setTimeout(()=>el.remove(),220)}},4500)}
function toast(msg,type='success'){showNotice(msg,type)}
function openModal(title,body,foot=''){const b=$('#modal-backdrop');if(!b)return;b.innerHTML=`<div class="modal" role="dialog"><div class="modal-head"><div class="modal-title">${title}</div><button class="modal-close" onclick="closeModal()">&times;</button></div><div class="modal-body">${body}</div>${foot?`<div class="modal-foot">${foot}</div>`:''}</div>`;b.classList.add('open')}
function closeModal(){$('#modal-backdrop')?.classList.remove('open')}
function nav(view){if(view==='station'&&state.user?.role!=='committee'){state.stationMember=null;state.stationContext=false;view='dashboard'}if(view==='procurement'&&!['committee','president'].includes(state.user?.role)){view='dashboard'}if(view==='my_deliveries'&&state.user?.role!=='member'&&!state.stationContext){view='dashboard'}state.view=view;document.getElementById('sidebar')?.classList.remove('open','active');document.querySelectorAll('.nav-link').forEach(x=>x.classList.toggle('active',x.dataset.view===view));const title=$('#page-title');if(title)title.textContent=titleFor(view);const c=$('#content');if(!c)return;renderView(view,c)}
function titleFor(v){return({dashboard:'ภาพรวมระบบ',station:'บริการสมาชิก',members:'ข้อมูลสมาชิก',catalog:'รายการโครงการ',procurement:'รอบจัดซื้อและรับสินค้า',requests:'คำขอของสมาชิก',payments:'การชำระคืน',ledger:'บัญชีรายรับ–รายจ่าย',reports:'รายงานประจำปีงบประมาณ',line:'ประกาศแจ้งเตือน LINE',approvals:'พิจารณาคำขอ',risk:'จัดการสถานะพิเศษ',my_requests:'คำขอของฉัน',my_payments:'การชำระคืนของฉัน',my_deliveries:'การรับสินค้า',new_request:'ยื่นคำขอ',profile:'ข้อมูลของฉัน'})[v]||'ระบบบริหารจัดการโครงการ'}
function renderShell(){const u=state.user,r=u.role;let menu='';if(r==='member')menu=`<div class="nav-section">สมาชิก</div><button class="nav-link" data-view="dashboard">${icon('grid-1x2')}ภาพรวม</button><button class="nav-link" data-view="new_request">${icon('basket2')}เลือกปัจจัยการผลิต</button><button class="nav-link" data-view="my_requests">${icon('file-earmark-text')}คำขอและสัญญา</button><button class="nav-link" data-view="my_payments">${icon('cash-stack')}การชำระคืน</button><button class="nav-link" data-view="my_deliveries">${icon('box-seam')}การรับสินค้า</button><button class="nav-link" data-view="profile">${icon('person')}ข้อมูลของฉัน</button>`;else if(r==='committee')menu=`<div class="nav-section">งานสำนักงาน</div><button class="nav-link" data-view="dashboard">${icon('grid-1x2')}ภาพรวม</button><button class="nav-link" data-view="station">${icon('person-workspace')}บริการสมาชิก</button><button class="nav-link" data-view="requests">${icon('clipboard-check')}ตรวจคำขอ</button><button class="nav-link" data-view="payments">${icon('receipt')}ตรวจการชำระ</button><div class="nav-section">จัดการโครงการ</div><button class="nav-link" data-view="catalog">${icon('boxes')}รายการโครงการ</button><button class="nav-link" data-view="procurement">${icon('truck')}รอบจัดซื้อและรับสินค้า</button><button class="nav-link" data-view="members">${icon('people')}สมาชิก</button><button class="nav-link" data-view="ledger">${icon('journal-text')}บัญชีรายรับ–รายจ่าย</button><button class="nav-link" data-view="reports">${icon('bar-chart')}รายงานประจำปี</button><button class="nav-link" data-view="line">${icon('megaphone')}ประกาศ LINE</button>`;else menu=`<div class="nav-section">บริหารกองทุน</div><button class="nav-link" data-view="dashboard">${icon('grid-1x2')}ภาพรวม</button><button class="nav-link" data-view="approvals">${icon('file-earmark-check')}พิจารณาคำขอ</button><button class="nav-link" data-view="catalog">${icon('boxes')}รายการโครงการ</button><button class="nav-link" data-view="procurement">${icon('truck')}รอบจัดซื้อและรับสินค้า</button><button class="nav-link" data-view="members">${icon('people')}สมาชิก</button><button class="nav-link" data-view="risk">${icon('shield-exclamation')}สถานะพิเศษ</button><button class="nav-link" data-view="reports">${icon('bar-chart')}รายงานประจำปี</button><button class="nav-link" data-view="ledger">${icon('journal-text')}บัญชีรายรับ–รายจ่าย</button>`;
 $('#app').innerHTML=`<div class="app-shell"><aside class="sidebar" id="sidebar"><div class="brand"><div class="brand-mark">${icon('building-check')}</div><div class="brand-title">กองทุนหมู่บ้านแม่ยางตาล</div><div class="brand-subtitle">ระบบบริหารจัดการโครงการประชารัฐ<br>ปุ๋ย ยา และเมล็ดพันธุ์</div></div><div class="sidebar-user"><div class="user-name">${esc(u.fullname)}</div><div class="user-role">${roleText(r)}</div></div><nav class="nav">${menu}</nav><div class="sidebar-footer"><button class="btn btn-secondary btn-block" onclick="logout()">${icon('box-arrow-right')}ออกจากระบบ</button></div></aside><section class="main"><header class="topbar"><div class="kpi-row"><button class="mobile-toggle" onclick="toggleSidebar()">${icon('list')}</button><div><h1 class="page-title" id="page-title">ภาพรวมระบบ</h1><div class="page-subtitle">${roleText(r)} · ระบบบริหารจัดการโครงการประชารัฐ</div></div></div><div class="topbar-actions"><span class="badge badge-neutral">ปีงบประมาณ ${new Date().getFullYear()+543}</span></div></header><main class="content"><div id="alert-area"></div><div id="content"></div></main></section></div><div id="modal-backdrop" class="modal-backdrop" onclick="if(event.target===this)closeModal()"></div>`;document.querySelectorAll('.nav-link').forEach(x=>x.addEventListener('click',()=>{nav(x.dataset.view);$('#sidebar')?.classList.remove('open')}));nav(r==='member'?'dashboard':'dashboard')}
function toggleSidebar(){$('#sidebar')?.classList.toggle('open')}
async function logout(){const r=await api('api/auth.php?action=logout',{method:'POST'});if(r){state.user=null;state.stationMember=null;state.stationContext=false;state.view='';renderLogin()}}
function renderLogin(){ $('#app').innerHTML=`<div class="login-page"><section class="login-intro"><div class="login-intro-inner"><div class="login-mark">${icon('building-check')}</div><h1>ระบบบริหารจัดการโครงการประชารัฐ</h1><p>ปุ๋ย ยา และเมล็ดพันธุ์<br>กองทุนหมู่บ้านแม่ยางตาล หมู่ที่ 5<br>อำเภอร้องกวาง จังหวัดแพร่</p><div class="login-points"><div class="login-point">${icon('check-circle-fill')}จัดการคำขอและติดตามสถานะเป็นขั้นตอน</div><div class="login-point">${icon('people-fill')}คณะกรรมการให้บริการสมาชิกผ่าน Station</div><div class="login-point">${icon('shield-check')}กำหนดสิทธิ์และตรวจสอบประวัติการทำรายการ</div></div></div></section><section class="login-panel"><div class="login-card"><h2>เข้าสู่ระบบ</h2><div class="sub">สำหรับสมาชิก คณะกรรมการ และประธานกองทุน</div><div id="alert-area"></div><form id="login-form"><div class="form-group"><label class="form-label">ชื่อผู้ใช้</label><input class="form-control" id="login-user" autocomplete="username" required></div><div class="form-group"><label class="form-label">รหัสผ่าน</label><input type="password" class="form-control" id="login-pass" autocomplete="current-password" required></div><button class="btn btn-primary btn-block" type="submit">${icon('box-arrow-in-right')}เข้าสู่ระบบ</button></form><div class="notice" style="margin-top:18px">สมาชิกที่มาสำนักงานสามารถให้คณะกรรมการดำเนินการแทนผ่านเมนู <strong>บริการสมาชิก</strong> โดยไม่ต้องเปิดเผยรหัสผ่าน</div></div></section></div>`;$('#login-form').addEventListener('submit',async e=>{e.preventDefault();const r=await api('api/auth.php?action=login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('#login-user').value.trim(),password:$('#login-pass').value})});if(r){state.user=r.user;state.stationMember=null;state.stationContext=false;state.view='';renderShell()}})}
async function renderView(v,c){if(v==='dashboard')return dashboard(c);if(v==='station')return station(c);if(v==='members')return members(c);if(v==='catalog')return catalog(c);if(v==='procurement')return procurement(c);if(v==='requests')return requests(c);if(v==='payments')return payments(c);if(v==='ledger')return ledger(c);if(v==='reports')return reports(c);if(v==='line')return line(c);if(v==='approvals')return approvals(c);if(v==='risk')return risk(c);if(v==='new_request')return newRequest(c);if(v==='my_requests')return myRequests(c);if(v==='my_payments')return myPayments(c);if(v==='my_deliveries')return myDeliveries(c);if(v==='profile')return profile(c)}
async function dashboard(c){
 const u=state.user;
 if(u.role==='member'){
  const r=await api('api/requests.php?action=list');
  const p=await api('api/payments.php?action=summary');
  const open=await api('api/catalog.php?action=current');
  state.requests=r?.data||[];
  c.innerHTML=`<div class="dashboard-page dashboard-member">
   <section class="dashboard-welcome"><div><span class="dashboard-eyebrow">พื้นที่สมาชิก</span><h2>ยินดีต้อนรับ คุณ ${esc(u.fullname)}</h2><p>ติดตามคำขอ ยอดชำระ และรอบโครงการของคุณได้จากหน้านี้</p></div><span class="dashboard-year">ปีงบประมาณ ${esc(open?.data?.year_be||new Date().getFullYear()+543)}</span></section>
   <div class="grid grid-4 dashboard-metrics"><article class="stat-card dashboard-stat"><div class="stat-icon">${icon('file-earmark-text')}</div><div class="stat-label">คำขอทั้งหมด</div><div class="stat-value">${state.requests.length}</div><div class="stat-note">รายการของคุณ</div></article><article class="stat-card dashboard-stat"><div class="stat-icon">${icon('cash-stack')}</div><div class="stat-label">ยอดที่ชำระแล้ว</div><div class="stat-value">${money(p?.data?.paid)}</div><div class="stat-note">บาท</div></article><article class="stat-card dashboard-stat"><div class="stat-icon">${icon('wallet2')}</div><div class="stat-label">ยอดคงเหลือ</div><div class="stat-value">${money(p?.data?.remaining)}</div><div class="stat-note">บาท</div></article><article class="stat-card dashboard-stat"><div class="stat-icon">${icon('calendar2-check')}</div><div class="stat-label">สถานะรอบรับคำขอ</div><div class="stat-value">${open?.data?.request_open?'เปิดรับ':'ปิดรับ'}</div><div class="stat-note">ปีงบประมาณ ${esc(open?.data?.year_be||'-')}</div></article></div>
   <div class="grid grid-2 dashboard-panels"><section class="card dashboard-panel"><div class="card-header"><div><h2 class="card-title">ความคืบหน้าคำขอล่าสุด</h2><p class="card-subtitle">ดูขั้นตอนปัจจุบันได้ทันที</p></div><button class="btn btn-secondary btn-sm" onclick="nav('my_requests')">ดูคำขอทั้งหมด</button></div>${state.requests[0]?timeline(state.requests[0]):empty('ยังไม่มีคำขอ','file-earmark-text')}</section><section class="card dashboard-panel"><div class="card-header"><div><h2 class="card-title">เริ่มทำรายการ</h2><p class="card-subtitle">ทางลัดสำหรับสมาชิก</p></div></div><div class="dashboard-actions"><button class="btn btn-primary" onclick="nav('new_request')">${icon('basket2')}ยื่นคำขอใหม่</button><button class="btn btn-secondary" onclick="nav('my_payments')">${icon('cash-stack')}ดูการชำระคืน</button><button class="btn btn-secondary" onclick="nav('profile')">${icon('person')}ข้อมูลของฉัน</button></div><div class="dashboard-notice">${icon('info-circle')}ข้อมูลสถานะและยอดชำระแสดงตามรายการของบัญชีคุณ</div></section></div>
  </div>`;
  return;
 }
 const [req,pay,m]=await Promise.all([api('api/requests.php?action=list'),api('api/payments.php?action=list'),api('api/members.php?action=list')]);
 state.requests=req?.data||[];state.payments=pay?.data||[];state.members=m?.data||[];
 const requestQueue=u.role==='president'?state.requests.filter(x=>x.status==='president_review').length:state.requests.filter(x=>['submitted','committee_review'].includes(x.status)).length;
 const activeRequests=state.requests.filter(x=>['contract_pending','member_confirmed','active'].includes(x.status)).length;
 const payPending=state.payments.filter(x=>x.status==='pending').length;
 const memberCount=state.members.filter(x=>x.role==='member').length;
 const reviewView=u.role==='president'?'approvals':'requests';
 const secondView=u.role==='committee'?'payments':'reports';
 const roleLabel=u.role==='president'?'ภาพรวมสำหรับประธานกองทุน':'ภาพรวมงานสำนักงาน';
 const latest=state.requests.slice(0,4);
 const queueRows=latest.length?latest.map(x=>`<div class="dashboard-request-row"><div class="dashboard-request-info"><strong>${esc(x.fullname||'สมาชิก')}</strong><span>คำขอ #${esc(x.id)} · ${esc(x.created_at||'')}</span></div><div class="dashboard-request-side">${badge(x.status)}<strong>${money(x.amount_requested)} บาท</strong></div></div>`).join(''):`<div class="dashboard-empty">${icon('inbox')}ยังไม่มีคำขอในระบบ</div>`;
 c.innerHTML=`<div class="dashboard-page">
  <section class="dashboard-welcome"><div><span class="dashboard-eyebrow">${roleLabel}</span><h2>ยินดีต้อนรับ คุณ ${esc(u.fullname)}</h2><p>ติดตามงานกองทุนและเปิดงานสำคัญได้จากภาพรวมนี้</p></div><span class="dashboard-year">ปีงบประมาณ ${new Date().getFullYear()+543}</span></section>
  <section class="grid grid-4 dashboard-metrics" aria-label="สรุปข้อมูลกองทุน">
   <article class="stat-card dashboard-stat"><div class="stat-icon">${icon('people')}</div><div class="stat-label">สมาชิก</div><div class="stat-value">${memberCount.toLocaleString('th-TH')}</div><div class="stat-note">สมาชิกที่อยู่ในระบบ</div></article>
   <article class="stat-card dashboard-stat dashboard-stat-alert"><div class="stat-icon">${icon('clipboard-check')}</div><div class="stat-label">คำขอรอดำเนินการ</div><div class="stat-value">${requestQueue.toLocaleString('th-TH')}</div><div class="stat-note">${u.role==='president'?'รอประธานพิจารณา':'รอคณะกรรมการตรวจ'}</div></article>
   <article class="stat-card dashboard-stat"><div class="stat-icon">${icon('boxes')}</div><div class="stat-label">คำขอที่กำลังดำเนินการ</div><div class="stat-value">${activeRequests.toLocaleString('th-TH')}</div><div class="stat-note">อนุมัติแล้วหรืออยู่ระหว่างชำระ</div></article>
   <article class="stat-card dashboard-stat dashboard-stat-alert"><div class="stat-icon">${icon('receipt')}</div><div class="stat-label">รายการชำระรอตรวจ</div><div class="stat-value">${payPending.toLocaleString('th-TH')}</div><div class="stat-note">ตรวจสอบหลักฐานการชำระ</div></article>
  </section>
  <section class="dashboard-grid">
   <article class="card dashboard-panel"><div class="card-header"><div><h2 class="card-title">งานที่ต้องดำเนินการ</h2><p class="card-subtitle">ทางลัดไปยังงานหลักของคุณ</p></div></div><div class="dashboard-actions"><button class="btn btn-primary" onclick="nav('${reviewView}')">${icon('clipboard-check')}${u.role==='president'?'พิจารณาคำขอ':'ตรวจคำขอ'}<span class="dashboard-action-count">${requestQueue}</span></button><button class="btn btn-secondary" onclick="nav('${secondView}')">${icon(u.role==='committee'?'receipt':'bar-chart')}${u.role==='committee'?'ตรวจการชำระ':'ดูรายงานกองทุน'}</button>${u.role==='committee'?'<button class="btn btn-secondary" onclick="nav(\'station\')">'+icon('person-workspace')+'บริการสมาชิก</button>':''}<button class="btn btn-secondary dashboard-action-wide" onclick="nav('procurement')">${icon('truck')}จัดการรอบจัดซื้อและรับสินค้า</button></div><div class="dashboard-notice">${icon('shield-check')}การดำเนินการแทนสมาชิกจะบันทึกผู้ปฏิบัติงานไว้ในประวัติระบบ</div></article>
   <article class="card dashboard-panel dashboard-queue"><div class="card-header"><div><h2 class="card-title">คำขอล่าสุด</h2><p class="card-subtitle">รายการล่าสุดจากระบบ</p></div><button class="btn btn-secondary btn-sm" onclick="nav('${reviewView}')">ดูทั้งหมด</button></div><div class="dashboard-request-list">${queueRows}</div></article>
  </section>
 </div>`;
}function timeline(r){const steps=[['ส่งคำขอแล้ว',['submitted','committee_review','president_review','contract_pending','member_confirmed','active','completed']],['คณะกรรมการตรวจสอบ',['committee_review','president_review','contract_pending','member_confirmed','active','completed']],['ประธานพิจารณา',['president_review','contract_pending','member_confirmed','active','completed']],['ยืนยันสัญญา',['member_confirmed','active','completed']],['ชำระคืน',['active','completed']]];let current=steps.findIndex(x=>x[1].includes(r.status));if(r.status==='completed')current=4;if(r.status==='revision_requested')current=1;return `<div class="timeline">${steps.map((x,i)=>`<div class="timeline-step ${i<current?'done':''} ${i===current?'current':''}"><div class="timeline-dot">${i<current?icon('check'):i+1}</div><div><div class="timeline-title">${x[0]}</div><div class="timeline-note">${i===current?esc(statusMap[r.status]?.[0]||'กำลังดำเนินการ'):i<current?'ดำเนินการแล้ว':''}</div></div></div>`).join('')}</div>`}
function empty(text,ico='inbox'){return `<div class="empty">${icon(ico)}<div>${esc(text)}</div></div>`}
async function station(c){if(state.stationMember){return stationMember(c)}c.innerHTML=`<div class="card"><div class="card-header"><div><h2 class="card-title">ค้นหาสมาชิกเพื่อให้บริการ</h2><p class="card-subtitle">ไม่ต้องใช้รหัสผ่านของสมาชิก ระบบจะบันทึกผู้ดำเนินการแทนทุกครั้ง</p></div></div><div class="toolbar"><input id="station-search" class="form-control" style="max-width:520px" placeholder="ชื่อสมาชิก / เลขสมาชิก / เลขบัตร / เบอร์โทร"><button class="btn btn-primary" onclick="searchStation()">${icon('search')}ค้นหา</button></div><div id="station-results" style="margin-top:18px"></div></div>`}
async function searchStation(){const q=$('#station-search').value.trim();const r=await api('api/members.php?action=search&search='+encodeURIComponent(q));const el=$('#station-results');if(!el)return;const rows=(r?.data||[]).filter(x=>x.role==='member');el.innerHTML=rows.length?`<div class="table-wrap mobile-stack-table station-table"><table class="table"><thead><tr><th>สมาชิก</th><th>เลขสมาชิก</th><th>โทรศัพท์</th><th>สถานะ</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr><td><div class="station-member"><div class="avatar">${esc(x.fullname).charAt(0)}</div><div><strong>${esc(x.fullname)}</strong><div class="small text-muted">${esc(x.username)}</div></div></div></td><td>${esc(x.username)}</td><td>${esc(x.phone)}</td><td>${x.risk_status==='normal'?'<span class="badge badge-success">ปกติ</span>':`<span class="badge badge-warning">${esc(x.risk_status)}</span>`}</td><td><button class="btn btn-primary btn-sm" onclick="openStation(${x.id})">${icon('person-workspace')}เปิดบริการสมาชิก</button></td></tr>`).join('')}</tbody></table></div>`:empty('ไม่พบสมาชิก','person-x')}
async function openStation(id){const r=await api('api/members.php?action=detail&id='+id);if(r){state.stationMember=r.data;nav('station')}}
function stationMember(c){const m=state.stationMember;c.innerHTML=`<div class="station-banner"><div class="station-member"><div class="avatar">${esc(m.fullname).charAt(0)}</div><div><strong>กำลังดำเนินการแทนสมาชิก: ${esc(m.fullname)}</strong><div class="small">เลขสมาชิก ${esc(m.username)} · ${esc(m.phone)}</div></div></div><button class="btn btn-secondary btn-sm" onclick="state.stationMember=null;nav('station')">${icon('x')}จบการให้บริการ</button></div><div class="grid grid-3"><button class="stat-card" onclick="stationNewRequest()"><div class="stat-icon">${icon('basket2')}</div><div class="fw-bold">สร้างคำขอ</div><div class="small text-muted">เลือกปุ๋ย ยา หรือเมล็ดพันธุ์</div></button><button class="stat-card" onclick="stationRequests()"><div class="stat-icon">${icon('file-earmark-text')}</div><div class="fw-bold">ติดตามคำขอ</div><div class="small text-muted">ดูสถานะและสัญญา</div></button><button class="stat-card" onclick="stationPayment()"><div class="stat-icon">${icon('cash-stack')}</div><div class="fw-bold">บันทึกการชำระ</div><div class="small text-muted">เงินสดหรือแนบหลักฐานโอน</div></button><button class="stat-card" onclick="stationDeliveries()"><div class="stat-icon">${icon('box-seam')}</div><div class="fw-bold">รับสินค้า</div><div class="small text-muted">ตรวจสอบและบันทึกการรับสินค้า</div></button></div><div class="card" style="margin-top:18px"><div class="card-header"><div><h2 class="card-title">ข้อมูลสมาชิก</h2><p class="card-subtitle">ข้อมูลที่ใช้ในการดำเนินการวันนี้</p></div></div><div class="form-grid"><div><div class="small text-muted">ชื่อ-นามสกุล</div><strong>${esc(m.fullname)}</strong></div><div><div class="small text-muted">เลขสมาชิก</div><strong>${esc(m.username)}</strong></div><div><div class="small text-muted">โทรศัพท์</div><strong>${esc(m.phone)}</strong></div><div><div class="small text-muted">สถานะ</div>${m.risk_status==='normal'?badge('active'):`<span class="badge badge-warning">${esc(m.risk_status)}</span>`}</div></div></div>`}
async function stationNewRequest(){state.stationContext=true;nav('new_request')}
async function stationRequests(){state.stationContext=true;nav('my_requests')}
async function stationPayment(){state.stationContext=true;nav('my_payments')}
async function stationDeliveries(){state.stationContext=true;nav('my_deliveries')}
async function procurement(c){const r=await api('api/procurement.php?action=list');state.procurement=r?.data||[];const fy=await api('api/catalog.php?action=current');state.fiscalYear=fy?.data;c.innerHTML=`<div class="grid grid-2 procurement-page"><div class="card"><div class="card-header"><div><h2 class="card-title">รอบจัดซื้อ</h2><p class="card-subtitle">รวมคำขอที่อนุมัติแล้วเพื่อจัดซื้อเป็นล็อต</p></div><button class="btn btn-primary btn-sm" onclick="createProcurementBatch()">${icon('plus-lg')}สร้างรอบจัดซื้อ</button></div>${state.procurement.length?`<div class="table-wrap mobile-stack-table procurement-table"><table class="table"><thead><tr><th>รอบ</th><th>ปี</th><th>สถานะ</th><th>คำขอ</th><th>รับแล้ว</th><th></th></tr></thead><tbody>${state.procurement.map(b=>`<tr><td><strong>${esc(b.batch_no)}</strong><div class="small text-muted">${esc(b.title)}</div></td><td>${esc(b.year_be)}</td><td>${badge(b.status)}</td><td>${b.request_count}</td><td>${money(b.received_qty)} / ${money(b.ordered_qty)}</td><td><button class="btn btn-secondary btn-sm" onclick="procurementDetail(${b.id})">${icon('eye')}จัดการ</button></td></tr>`).join('')}</tbody></table></div>`:empty('ยังไม่มีรอบจัดซื้อ','truck')}</div><div class="card"><div class="card-header"><div><h2 class="card-title">ขั้นตอนการจัดส่งมอบ</h2><p class="card-subtitle">รับสินค้าเข้ารอบ → ประกาศ → สมาชิกมารับ → ยืนยันส่งมอบ</p></div></div><div class="notice">ระบบจะไม่เปิดเผยข้อมูลร้านค้าให้สมาชิก และจะสร้างรายการรับสินค้าแยกตามคำขอของสมาชิก</div></div></div>`}
function toggleSelectAllProcRequests(forceState){
  const cbs = [...document.querySelectorAll('.proc-request')];
  if(!cbs.length) return;
  const master = $('#proc-select-all');
  const btn = $('#btn-toggle-all-proc');
  const target = forceState !== undefined ? forceState : !cbs.every(cb => cb.checked);
  cbs.forEach(cb => { cb.checked = target; });
  if(master) master.checked = target;
  if(btn){
    btn.innerHTML = target ? `${icon('dash-square')} ยกเลิกการเลือก` : `${icon('check-all')} เลือกทั้งหมด`;
  }
}
function updateProcSelectAllState(){
  const cbs = [...document.querySelectorAll('.proc-request')];
  if(!cbs.length) return;
  const master = $('#proc-select-all');
  const btn = $('#btn-toggle-all-proc');
  const allChecked = cbs.every(cb => cb.checked);
  const noneChecked = cbs.every(cb => !cb.checked);
  if(master){
    master.checked = allChecked;
    master.indeterminate = !allChecked && !noneChecked;
  }
  if(btn){
    btn.innerHTML = allChecked ? `${icon('dash-square')} ยกเลิกการเลือก` : `${icon('check-all')} เลือกทั้งหมด`;
  }
}
async function createProcurementBatch(){
  const r = await api('api/procurement.php?action=eligible_requests');
  const rows = r?.data || [];
  if(!rows.length){
    openModal('ยังไม่มีคำขอพร้อมจัดซื้อ',`<div class="notice">ขณะนี้ยังไม่มีคำขอที่ผ่านการอนุมัติและยืนยันสัญญา ซึ่งยังไม่ถูกรวมเข้ารอบจัดซื้อ</div>`,`<button class="btn btn-secondary" onclick="closeModal()">ปิด</button>`);
    return;
  }
  openModal('สร้างรอบจัดซื้อ',`<form id="proc-form">
    <div class="form-group">
      <label class="form-label">ชื่อรอบจัดซื้อ</label>
      <input id="proc-title" class="form-control" value="รอบจัดซื้อประจำปี ${esc(state.fiscalYear?.year_be||'')}" required>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 8px;flex-wrap:wrap;gap:8px">
      <div class="section-title" style="margin:0">เลือกคำขอที่อนุมัติแล้ว (${rows.length} รายการ)</div>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-toggle-all-proc" onclick="toggleSelectAllProcRequests()">${icon('check-all')} เลือกทั้งหมด</button>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th style="width:40px;text-align:center"><input type="checkbox" id="proc-select-all" title="เลือกทั้งหมด" onchange="toggleSelectAllProcRequests(this.checked)"></th>
            <th>สมาชิก</th>
            <th>วงเงิน</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(x=>`<tr>
            <td style="text-align:center"><input type="checkbox" class="proc-request" value="${x.id}" onchange="updateProcSelectAllState()"></td>
            <td><strong>${esc(x.fullname)}</strong><div class="small text-muted">${esc(x.username)}</div></td>
            <td>${money(x.amount_requested)} บาท</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <button class="btn btn-primary btn-block" style="margin-top:16px">${icon('check2')}สร้างรอบจัดซื้อ</button>
  </form>`);
  $('#proc-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const ids = [...document.querySelectorAll('.proc-request:checked')].map(x=>Number(x.value));
    if(!ids.length){
      toast('กรุณาเลือกคำขออย่างน้อย 1 รายการ','error');
      return;
    }
    const x = await api('api/procurement.php?action=create_batch',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({fiscal_year_id:state.fiscalYear.id,title:$('#proc-title').value.trim(),request_ids:ids})
    });
    if(x){
      closeModal();
      nav('procurement');
    }
  });
}
async function procurementDetail(id){const r=await api('api/procurement.php?action=detail&id='+id);if(!r)return;const b=r.data;const d=await api('api/procurement.php?action=deliveries&batch_id='+id);const deliveries=d?.data||[];openModal('จัดการ '+b.batch_no,`<div class="notice"><strong>${esc(b.title)}</strong><br>สถานะ: ${badge(b.status)} · คำขอ ${b.requests.length} รายการ</div><div class="section-title">รายการจัดซื้อและรับเข้า</div><div class="table-wrap mobile-stack-table procurement-detail-table"><table class="table"><thead><tr><th>สินค้า</th><th>สั่ง</th><th>รับแล้ว</th><th>หน่วย</th></tr></thead><tbody>${b.items.map(i=>`<tr><td>${esc(i.item_name_snapshot)}</td><td>${money(i.quantity_ordered)}</td><td>${b.status!=='draft'?`<input class="form-control proc-received" data-id="${i.id}" type="number" min="0" max="${i.quantity_ordered}" step="0.01" value="${i.quantity_received}">`:money(i.quantity_received)}</td><td>${esc(i.unit_snapshot)}</td></tr>`).join('')}</tbody></table></div><div class="section-title">สมาชิกที่เตรียมรับสินค้า</div>${deliveries.length?`<div class="table-wrap mobile-stack-table procurement-delivery-table"><table class="table"><thead><tr><th>สมาชิก</th><th>สถานะ</th><th>วันที่รับ</th><th></th></tr></thead><tbody>${deliveries.map(x=>`<tr><td>${esc(x.fullname)}</td><td>${badge(x.delivery_status)}</td><td>${x.delivery_date?new Date(x.delivery_date).toLocaleDateString('th-TH'):'-'}</td><td>${x.delivery_status==='delivered'?`<span class="badge badge-success">${esc(x.receipt_number||'รับแล้ว')}</span>`:`<button class="btn btn-primary btn-sm" onclick="deliverProduct(${x.id},${id})">${icon('box-seam')}บันทึกส่งมอบ</button>`}</td></tr>`).join('')}</tbody></table></div>`:empty('ยังไม่มีรายการรับสินค้า','box-seam')}`,`<button class="btn btn-secondary" onclick="closeModal()">ปิด</button>${b.items.length?`<button class="btn btn-secondary" onclick="receivingInspection(${id})">${icon('clipboard-check')}ตรวจรับสินค้าที่มาส่ง</button>`:''}${b.status==='received_complete'||b.status==='announced'?`<button class="btn btn-primary" onclick="announceProcurement(${id})">${icon('megaphone')}ประกาศพร้อมรับ</button>`:''}${b.status==='received_complete'||b.status==='announced'?`<button class="btn btn-secondary" onclick="prepareDeliveries(${id})">${icon('people')}เตรียมรายการสมาชิก</button>`:''}`)}
async function receiveProcurement(id){const items=[...document.querySelectorAll('.proc-received')].map(x=>({id:Number(x.dataset.id),quantity_received:Number(x.value||0)}));const r=await api('api/procurement.php?action=receive',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({batch_id:id,items})});if(r){closeModal();nav('procurement')}}
async function announceProcurement(id){openModal('ประกาศพร้อมรับสินค้า',`<form id="announce-form"><div class="form-group"><label class="form-label">ข้อความประกาศ</label><textarea id="announce-text" class="form-control" rows="4">สินค้าตามรอบจัดซื้อพร้อมให้สมาชิกมารับที่สำนักงานกองทุนหมู่บ้าน</textarea></div><button class="btn btn-primary btn-block">${icon('megaphone')}ประกาศพร้อมรับสินค้า</button></form>`);$('#announce-form').addEventListener('submit',async e=>{e.preventDefault();const r=await api('api/procurement.php?action=announce',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({batch_id:id,announcement_text:$('#announce-text').value.trim()})});if(r){closeModal();nav('procurement')}})}
async function prepareDeliveries(id){const r=await api('api/procurement.php?action=prepare_deliveries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({batch_id:id})});if(r){closeModal();nav('procurement')}}
async function deliverProduct(deliveryId,batchId){openModal('ยืนยันการรับสินค้า',`<form id="delivery-form"><div class="form-group"><label class="form-label">ผู้รับสินค้า</label><input id="delivery-name" class="form-control" required></div><div class="form-group"><label class="form-label">รับในฐานะ</label><select id="delivery-as" class="form-select"><option value="member">สมาชิก</option><option value="representative">ผู้รับแทน</option></select></div><div class="form-group"><label class="form-label">เลขบัตรประชาชนผู้รับ</label><input id="delivery-idno" class="form-control"></div><div class="form-group"><label class="form-label">ความสัมพันธ์ (กรณีรับแทน)</label><input id="delivery-rel" class="form-control"></div><div class="form-group"><label class="form-label">หมายเหตุ</label><textarea id="delivery-note" class="form-control"></textarea></div><button class="btn btn-primary btn-block">${icon('check2-circle')}ยืนยันส่งมอบ</button></form>`);$('#delivery-form').addEventListener('submit',async e=>{e.preventDefault();const r=await api('api/procurement.php?action=deliver',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({delivery_id:deliveryId,received_by_name:$('#delivery-name').value.trim(),received_by_national_id:$('#delivery-idno').value.trim(),received_as:$('#delivery-as').value,representative_relation:$('#delivery-rel').value.trim(),note:$('#delivery-note').value.trim()})});if(r){closeModal();nav('procurement')}})}

async function catalog(c){const cur=await api('api/catalog.php?action=current');state.fiscalYear=cur?.data;const items=await api('api/catalog.php?action=list&fiscal_year_id='+(state.fiscalYear?.id||''));state.catalog=items?.data||[];const canManage=state.user.role!=='member';c.innerHTML=`<div class="card"><div class="card-header"><div><h2 class="card-title">รายการโครงการ ปีงบประมาณ ${esc(state.fiscalYear?.year_be)}</h2><p class="card-subtitle">รายการเกิดจากการสืบราคาตลาดประจำปี สมาชิกจะเห็นเฉพาะรายการ ไม่เห็นข้อมูลร้านค้า</p></div>${canManage?`<div class="toolbar"><button class="btn btn-secondary btn-sm" onclick="toggleRequestIntake()">${icon(state.fiscalYear?.request_open?'lock':'unlock')}${state.fiscalYear?.request_open?'ปิดรับคำขอ':'เปิดรับคำขอ'}</button>${state.fiscalYear?.status==='closed'?`<button class="btn btn-primary btn-sm" onclick="createNextFiscalYear()">${icon('calendar-plus')}สร้างปีงบประมาณถัดไป</button>`:`<button class="btn btn-secondary btn-sm" onclick="closeFiscalYear()">${icon('archive')}ปิดปีงบประมาณ</button>`}<button class="btn btn-primary btn-sm" onclick="showCatalogForm()">${icon('plus-lg')}เพิ่มรายการ</button></div>`:''}</div>${canManage?`<div class="notice" style="margin-bottom:18px">สถานะสืบราคาตลาดประจำปี: <strong>${state.fiscalYear?.market_survey_done?'เรียบร้อยแล้ว':'ยังไม่ได้บันทึก'}</strong> ${!state.fiscalYear?.market_survey_done?`<button class="btn btn-secondary btn-sm" style="margin-left:8px" onclick="markSurvey()">${icon('check2')}บันทึกว่าสืบราคาแล้ว</button>`:''}</div>`:''}<div class="catalog-grid">${state.catalog.length?state.catalog.map(x=>`<div class="catalog-card"><div class="catalog-image">${x.image_file?`<img src="uploads/catalog/${encodeURIComponent(x.image_file)}" alt="${esc(x.name)}" loading="lazy">`:icon(x.category==='seed'?'flower1':x.category==='medicine'?'capsule-pill':'box-seam')}</div><div class="catalog-body"><div class="catalog-name">${esc(x.name)}</div><div class="catalog-meta">${esc(x.description||'')} · ต่อ ${esc(x.unit)}</div><div class="catalog-price">${money(x.unit_price)} บาท</div>${canManage?`<button class="btn btn-secondary btn-sm" onclick="showCatalogForm(${x.id})">${icon('pencil')}แก้ไขรายการ</button>`:''}</div></div>`).join(''):empty('ยังไม่มีรายการสำหรับปีงบประมาณนี้','boxes')}</div></div>`}
async function toggleRequestIntake(){if(!state.fiscalYear)return;const open=!Number(state.fiscalYear.request_open);const r=await api('api/catalog.php?action=set_request_open',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fiscal_year_id:state.fiscalYear.id,request_open:open})});if(r)nav('catalog')}
async function markSurvey(){const r=await api('api/catalog.php?action=set_market_survey_done',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fiscal_year_id:state.fiscalYear.id,market_survey_done:true})});if(r)nav('catalog')}
async function closeFiscalYear(){if(!confirm('ยืนยันปิดปีงบประมาณ '+state.fiscalYear.year_be+'? การปิดจะหยุดการยื่นคำขอใหม่ แต่ข้อมูลและหนี้คงค้างจะยังอยู่'))return;const r=await api('api/catalog.php?action=close_year',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fiscal_year_id:state.fiscalYear.id})});if(r)nav('catalog')}
async function createNextFiscalYear(){const year=Number(state.fiscalYear.year_be)+1;const r=await api('api/catalog.php?action=create_year',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({year_be:year})});if(r)nav('catalog')}
function showCatalogForm(id){const x=state.catalog.find(i=>i.id==id);openModal(id?'แก้ไขรายการโครงการ':'เพิ่มรายการโครงการ',`<form id="catalog-form" enctype="multipart/form-data"><input type="hidden" id="cat-id" value="${id||''}"><div class="form-grid"><div class="form-group"><label class="form-label">ประเภท</label><select class="form-select" id="cat-category"><option value="fertilizer" ${x?.category==='fertilizer'?'selected':''}>ปุ๋ย</option><option value="medicine" ${x?.category==='medicine'?'selected':''}>ยา</option><option value="seed" ${x?.category==='seed'?'selected':''}>เมล็ดพันธุ์</option><option value="other" ${x?.category==='other'?'selected':''}>อื่น ๆ</option></select></div><div class="form-group"><label class="form-label">ชื่อรายการ</label><input class="form-control" id="cat-name" value="${esc(x?.name)}" required></div></div><div class="form-grid"><div class="form-group"><label class="form-label">หน่วย</label><input class="form-control" id="cat-unit" value="${esc(x?.unit||'รายการ')}" required></div><div class="form-group"><label class="form-label">ราคาอ้างอิงของโครงการ (บาท)</label><input type="number" min="0" step="0.01" class="form-control" id="cat-price" value="${x?.unit_price||0}" required></div></div><div class="form-group"><label class="form-label">รูปสินค้า</label><input class="form-control" id="cat-image" type="file" accept="image/jpeg,image/png,image/webp"><div class="form-help">ถ่ายรูปจากกล้องมือถือหรือเลือกไฟล์ JPG, PNG, WEBP ขนาดไม่เกิน 5MB</div>${x?.image_file?`<div style="margin-top:10px"><img src="uploads/catalog/${encodeURIComponent(x.image_file)}" alt="${esc(x.name)}" style="width:120px;height:90px;object-fit:cover;border-radius:10px"></div>`:''}</div><div class="form-group"><label class="form-label">รายละเอียด</label><textarea class="form-control" id="cat-desc">${esc(x?.description)}</textarea></div><button class="btn btn-primary btn-block">${icon('save')}บันทึก</button></form>`);$('#catalog-form').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData();fd.append('fiscal_year_id',state.fiscalYear.id);fd.append('category',$('#cat-category').value);fd.append('name',$('#cat-name').value.trim());fd.append('unit',$('#cat-unit').value.trim());fd.append('unit_price',$('#cat-price').value);fd.append('description',$('#cat-desc').value);if($('#cat-image').files[0])fd.append('image',$('#cat-image').files[0]);if(id)fd.append('id',id);const r=await api(id?'api/catalog.php?action=update_item':'api/catalog.php?action=create_item',{method:'POST',body:fd});if(r){closeModal();nav('catalog')}})}
async function newRequest(c){const member=state.stationMember||state.user;if(member.role!=='member')return;const cur=await api('api/catalog.php?action=current');const items=await api('api/catalog.php?action=list&fiscal_year_id='+(cur?.data?.id||''));if(!cur?.data?.request_open){c.innerHTML=`<div class="card">${empty('ขณะนี้ปิดรับคำขอสำหรับปีงบประมาณ '+(cur?.data?.year_be||''),'lock')}</div>`;return}state.catalog=items?.data||[];state.requestDraft=state.requestDraft||{quantities:{},purpose:'',guarantors:[{fullname:'',national_id:'',phone:''},{fullname:'',national_id:'',phone:''},{fullname:'',national_id:'',phone:''}],documents:{}};state.requestStep='select';const d=state.requestDraft;c.className='member-request-root';c.innerHTML=`<div class="member-select-only"><div class="card member-catalog-only"><div class="card-header"><div><h2 class="card-title">เลือกปัจจัยการผลิต</h2><p class="card-subtitle">เลือกสินค้าที่ต้องการยื่นคำขอ แล้วกดดำเนินการต่อ</p></div></div><div class="member-catalog-list">${state.catalog.map(x=>`<div class="catalog-card"><div class="catalog-image">${x.image_file?`<img src="uploads/catalog/${encodeURIComponent(x.image_file)}" alt="${esc(x.name)}" loading="lazy">`:icon(x.category==='seed'?'flower1':x.category==='medicine'?'capsule-pill':'box-seam')}</div><div class="catalog-body"><div class="catalog-name">${esc(x.name)}</div><div class="catalog-meta">${esc(x.unit)}</div><div class="catalog-price">${money(x.unit_price)} บาท</div><div class="qty-control"><button type="button" onclick="changeQty(${x.id},-1)">−</button><input id="qty-${x.id}" type="number" min="0" step="1" value="${Number(d.quantities[x.id]||0)}" onchange="setQty(${x.id},this.value)"><button type="button" onclick="changeQty(${x.id},1)">+</button></div></div></div>`).join('')}</div><div id="member-selection-status" class="text-muted">ยังไม่ได้เลือกรายการ</div><button class="btn btn-primary btn-block" type="button" onclick="reviewRequest()">${icon('arrow-right-circle')} ดูรายการที่เลือกและกรอกข้อมูล</button></div></div>`;updateCart()}
function reviewRequest(){const items=cartItems();if(!items.length){toast('กรุณาเลือกรายการอย่างน้อย 1 รายการ','error');return}state.requestStep='review';renderRequestReview($('#content'),state.stationMember||state.user)}

function setQty(id,value){state.requestDraft=state.requestDraft||{quantities:{}};state.requestDraft.quantities=state.requestDraft.quantities||{};state.requestDraft.quantities[id]=Math.max(0,Number(value||0));const input=$('#qty-'+id);if(input)input.value=state.requestDraft.quantities[id];updateCart()}
function saveRequestDetails(){const d=state.requestDraft=state.requestDraft||{quantities:{},purpose:'',guarantors:[],documents:{}};const purpose=$('#req-purpose');if(purpose)d.purpose=purpose.value;d.guarantors=[1,2,3].map(i=>({fullname:$('#g-name-'+i)?.value||'',national_id:$('#g-id-'+i)?.value||'',phone:$('#g-phone-'+i)?.value||''}));d.documents={id_card:!!$('#doc-id_card')?.checked,house_reg:!!$('#doc-house_reg')?.checked,spouse_consent:!!$('#doc-spouse_consent')?.checked,land_deed:!!$('#doc-land_deed')?.checked}}
function renderRequestReview(c,member){const items=cartItems(),total=items.reduce((s,x)=>s+x.quantity*x.price,0),d=state.requestDraft||{};c.innerHTML=`${state.stationMember?`<div class="station-banner"><div><strong>${icon('person-workspace')} กำลังดำเนินการแทน ${esc(member.fullname)}</strong></div><button class="btn btn-secondary btn-sm" onclick="nav('station')">กลับ Station</button></div>`:''}<div class="member-request-page request-flow-vertical"><div class="card request-review-card"><div class="card-header"><div><div class="small text-muted">ขั้นตอนที่ 2 จาก 2</div><h2 class="card-title">สรุปรายการและรายละเอียดคำขอ</h2><p class="card-subtitle">ตรวจสอบรายการก่อนกรอกข้อมูลและส่งคำขอ คุณสามารถย้อนกลับไปเพิ่มหรือแก้ไขสินค้าได้ทุกเมื่อ</p></div></div><div class="request-review"><div class="section-title">รายการที่เลือก</div>${items.map(x=>`<div class="receipt-row"><span>${esc(x.name)} × ${x.quantity} ${esc(x.unit)}</span><strong>${money(x.quantity*x.price)} บาท</strong></div>`).join('')}<div class="divider"></div><div class="receipt-row review-total"><strong>รวมทั้งสิ้น</strong><strong class="text-success">${money(total)} บาท</strong></div><div class="form-group"><label class="form-label">วัตถุประสงค์ <span class="text-danger">*</span></label><textarea class="form-control" id="req-purpose" placeholder="ระบุวัตถุประสงค์การนำไปใช้" onchange="saveRequestDetails()">${esc(d.purpose||'')}</textarea></div><div class="section-title">ผู้ค้ำประกัน ตามแบบฟอร์มโครงการ (สูงสุด 3 ท่าน)</div>${[1,2,3].map(i=>{const g=(d.guarantors||[])[i-1]||{};return `<div class="form-group"><label class="form-label">ผู้ค้ำประกันคนที่ ${i}</label><input class="form-control" id="g-name-${i}" placeholder="ชื่อ-นามสกุล" value="${esc(g.fullname||'')}" onchange="saveRequestDetails()"><div class="form-grid"><input class="form-control" id="g-id-${i}" placeholder="เลขบัตรประชาชน" value="${esc(g.national_id||'')}" onchange="saveRequestDetails()"><input class="form-control" id="g-phone-${i}" placeholder="เบอร์โทรศัพท์" value="${esc(g.phone||'')}" onchange="saveRequestDetails()"></div></div>`}).join('')}<div class="section-title">เอกสารประกอบ</div><div class="request-docs">${[['id_card','สำเนาบัตรประชาชน'],['house_reg','สำเนาทะเบียนบ้าน'],['spouse_consent','หนังสือยินยอมคู่สมรส'],['land_deed','เอกสารสิทธิ์ที่ดิน']].map(x=>`<label><input type="checkbox" id="doc-${x[0]}" ${d.documents?.[x[0]]?'checked':''} onchange="saveRequestDetails()"> ${x[1]}</label>`).join('')}</div><div class="request-actions"><button class="btn btn-secondary" type="button" onclick="saveRequestDetails();state.requestStep='select';nav('new_request')">${icon('arrow-left')}กลับไปเลือก/แก้ไขรายการ</button><button class="btn btn-primary" type="button" onclick="submitRequest()">${icon('send')}ยืนยันและส่งคำขอ</button></div></div></div></div>`}

function changeQty(id,d){const current=Number(state.requestDraft?.quantities?.[id]||0);setQty(id,Math.max(0,current+d))}
function cartItems(){const draft=state.requestDraft||{quantities:{}};return (state.catalog||[]).map(x=>({catalog_item_id:x.id,quantity:Number(draft.quantities?.[x.id]||0),name:x.name,unit:x.unit,price:Number(x.unit_price)})).filter(x=>x.quantity>0)}
function updateCart(){const items=cartItems(),total=items.reduce((s,x)=>s+x.quantity*x.price,0),el=$('#cart-box');if(!el)return;el.innerHTML=items.length?`${items.map(x=>`<div class="receipt-row"><span>${esc(x.name)} × ${x.quantity}</span><strong>${money(x.quantity*x.price)}</strong></div>`).join('')}<div class="receipt-row"><strong>รวมคำขอ</strong><strong class="text-success">${money(total)} บาท</strong></div>`:'<div class="empty" style="padding:18px">ยังไม่ได้เลือกรายการ</div>'}
async function submitRequest(e){if(e&&e.preventDefault)e.preventDefault();saveRequestDetails();const member=state.stationMember||state.user,items=cartItems(),total=items.reduce((s,x)=>s+x.quantity*x.price,0),draft=state.requestDraft;if(total<10000||total>65000){toast('ยอดคำขอต้องอยู่ระหว่าง 10,000 ถึง 65,000 บาท','error');return}if(!draft.purpose){toast('กรุณาระบุวัตถุประสงค์การนำไปใช้','error');return}const gs=(draft.guarantors||[]).map(x=>({fullname:(x.fullname||'').trim(),national_id:(x.national_id||'').trim(),phone:(x.phone||'').trim()})).filter(x=>x.fullname);const body={member_id:state.stationMember?member.id:undefined,items,purpose:draft.purpose.trim(),guarantors:gs,checklist_documents:draft.documents||{}};const r=await api('api/requests.php?action=create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(r){toast(r.message);state.requestDraft=null;state.requestStep='select';state.stationMember?nav('station'):nav('my_requests')}}
async function myRequests(c){const member=state.stationMember||state.user;const r=await api('api/requests.php?action=list&member_id='+(state.stationMember?member.id:''));state.requests=r?.data||[];c.innerHTML=`${state.stationMember?`<div class="station-banner"><strong>${icon('person-workspace')} กำลังดำเนินการแทน ${esc(member.fullname)}</strong><button class="btn btn-secondary btn-sm" onclick="nav('station')">กลับ Station</button></div>`:''}<div class="card"><div class="card-header"><div><h2 class="card-title">คำขอและสัญญา</h2><p class="card-subtitle">ติดตามขั้นตอนตั้งแต่ยื่นคำขอจนถึงชำระคืน</p></div></div>${state.requests.length?`<div class="table-wrap"><table class="table"><thead><tr><th>วันที่</th><th>ปี</th><th>ยอดคำขอ</th><th>สถานะ</th><th>การดำเนินการ</th></tr></thead><tbody>${state.requests.map(x=>`<tr><td>${new Date(x.created_at).toLocaleDateString('th-TH')}</td><td>${esc(x.year_be||'-')}</td><td>${money(x.amount_requested)} บาท</td><td>${badge(x.status)}</td><td><button class="btn btn-secondary btn-sm" onclick="requestDetail(${x.id})">${icon('eye')}รายละเอียด</button><button class="btn btn-secondary btn-sm" style="margin-left:5px" onclick="printOfficialFormModal(${x.id})">${icon('printer')}พิมพ์เอกสาร</button>${x.status==='contract_pending'?`<button class="btn btn-primary btn-sm" style="margin-left:5px" onclick="confirmContract(${x.id})">${icon('pen')}ยืนยันสัญญา</button>`:''}${x.status==='revision_requested'?`<button class="btn btn-warning btn-sm" style="margin-left:5px" onclick="reviseRequest(${x.id})">${icon('arrow-repeat')}ส่งกลับเข้าตรวจ</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:empty('ยังไม่มีคำขอ','file-earmark-text')}</div>`}
async function requestDetail(id){const r=await api('api/requests.php?action=detail&id='+id);if(!r)return;const x=r.data;openModal('รายละเอียดคำขอ #'+x.id,`<div class="grid grid-2"><div><div class="small text-muted">สมาชิก</div><strong>${esc(x.member_name)}</strong></div><div><div class="small text-muted">ยอดคำขอ</div><strong>${money(x.amount_requested)} บาท</strong></div></div><div class="section-title">สถานะ</div>${timeline(x)}<div class="section-title">รายการ</div><div class="table-wrap"><table class="table"><thead><tr><th>รายการ</th><th>จำนวน</th><th>ราคา</th><th>รวม</th></tr></thead><tbody>${(x.items||[]).map(i=>`<tr><td>${esc(i.item_name_snapshot)}</td><td>${i.quantity} ${esc(i.unit_snapshot)}</td><td>${money(i.unit_price_snapshot)}</td><td>${money(i.line_total)}</td></tr>`).join('')}</tbody></table></div><div class="section-title">ผู้ค้ำประกัน</div>${(x.guarantors||[]).length?(x.guarantors||[]).map(g=>`<div class="notice">${esc(g.guarantor_no)}. ${esc(g.fullname)} · ${esc(g.national_id||'-')} · ${esc(g.phone||'-')}</div>`).join(''):empty('ไม่มีข้อมูลผู้ค้ำประกัน','people')}${x.revision_note?`<div class="alert alert-warning" style="margin-top:15px">${esc(x.revision_note)}</div>`:''}`,`<button class="btn btn-secondary" onclick="closeModal()">ปิด</button><button class="btn btn-primary" onclick="printOfficialFormModal(${id})">${icon('printer')}พิมพ์แบบฟอร์ม/สัญญา</button>`)}
async function confirmContract(id){openModal('ยืนยันสัญญาและกำหนดแผนชำระ',`<form id="contract-form"><div class="form-group"><label class="form-label">รูปแบบการชำระ</label><select class="form-select" id="pay-mode"><option value="installment">แบ่งชำระเป็นงวด</option><option value="lump_sum">ชำระเป็นก้อน</option></select></div><div class="form-grid"><div class="form-group"><label class="form-label">จำนวนงวด</label><input type="number" min="1" max="60" class="form-control" id="pay-count" value="12"></div><div class="form-group"><label class="form-label">หักเงินค้ำประกันความเสี่ยง (ถ้ามี)</label><input type="number" min="0" class="form-control" id="risk-deduction" value="0"></div></div><div class="form-group"><label class="form-label">วันครบกำหนดงวดแรก</label><input type="date" class="form-control" id="first-due" value="${new Date().toISOString().slice(0,10)}"></div><div class="notice">ระบบจะคำนวณดอกเบี้ยตามอัตรา 6% ต่อปีตามข้อมูลโครงการ และสร้างตารางงวดสำหรับติดตามการชำระ</div><button class="btn btn-primary btn-block">${icon('check2-circle')}ยืนยันสัญญา</button></form>`);$('#contract-form').addEventListener('submit',async e=>{e.preventDefault();const r=await api('api/requests.php?action=confirm_contract'+(state.stationMember?'&member_id='+state.stationMember.id:''),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,payment_mode:$('#pay-mode').value,installment_count:$('#pay-count').value,risk_deduction:$('#risk-deduction').value,first_due_date:$('#first-due').value})});if(r){closeModal();nav('my_requests')}})}
async function reviseRequest(id){const r=await api('api/requests.php?action=revise',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,member_id:state.stationMember?.id})});if(r){toast(r.message);nav('my_requests')}}
async function requests(c){
  const r = await api('api/requests.php?action=list');
  state.requests = r?.data || [];
  c.innerHTML = `<div class="card">
    <div class="card-header">
      <div>
        <h2 class="card-title">คำขอที่อยู่ระหว่างดำเนินการ</h2>
        <p class="card-subtitle">คณะกรรมการตรวจสอบก่อนส่งต่อให้ประธาน และพิมพ์สัญญาสำหรับคำขอที่อนุมัติแล้ว</p>
      </div>
    </div>
    ${state.requests.length ? `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>สมาชิก</th>
              <th>ยอดขอ</th>
              <th>สถานะ</th>
              <th>วันที่</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            ${state.requests.map(x => `
              <tr>
                <td><strong>${esc(x.fullname)}</strong><div class="small text-muted">${esc(x.username || '')}</div></td>
                <td>${money(x.amount_requested)}</td>
                <td>${badge(x.status)}</td>
                <td>${new Date(x.created_at).toLocaleDateString('th-TH')}</td>
                <td>
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    ${['contract_pending','member_confirmed','active','completed'].includes(x.status) ? `
                      <button class="btn btn-primary btn-sm" onclick="printOfficialFormModal(${x.id})">${icon('printer')} พิมพ์สัญญาให้เซ็น</button>
                    ` : ''}
                    <button class="btn btn-secondary btn-sm" onclick="committeeRequest(${x.id})">${icon('eye')} ${['submitted','committee_review'].includes(x.status) ? 'ตรวจสอบ' : 'ดูรายละเอียด'}</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : empty('ไม่มีคำขอที่ต้องดำเนินการ', 'clipboard')}
  </div>`;
}
async function committeeRequest(id){
  const r = await api('api/requests.php?action=detail&id=' + id);
  if (!r) return;
  const x = r.data;
  openModal('ตรวจสอบคำขอ #' + id, `
    <div class="grid grid-2">
      <div><div class="small text-muted">สมาชิก</div><strong>${esc(x.member_name)}</strong></div>
      <div><div class="small text-muted">ยอดคำขอ</div><strong>${money(x.amount_requested)} บาท</strong></div>
    </div>
    <div class="section-title">รายการปัจจัยการผลิตที่ยื่นขอ</div>
    ${(x.items || []).map(i => `
      <div class="receipt-row">
        <span>${esc(i.item_name_snapshot)} × ${i.quantity} ${esc(i.unit_snapshot || '')}</span>
        <strong>${money(i.line_total)}</strong>
      </div>
    `).join('')}
    <div class="section-title">ผู้ค้ำประกัน</div>
    ${(x.guarantors || []).map(g => `
      <div class="notice" style="margin-bottom:6px">
        ${esc(g.guarantor_no)}. <strong>${esc(g.fullname)}</strong> · เลขบัตร: ${esc(g.national_id || '-')} · โทร: ${esc(g.phone || '-')}
      </div>
    `).join('') || empty('ไม่มีข้อมูลผู้ค้ำประกัน', 'people')}
    ${['submitted','committee_review'].includes(x.status) ? `
      <div class="section-title">หมายเหตุการพิจารณา</div>
      <textarea id="decision-note" class="form-control" placeholder="ระบุหมายเหตุถ้าต้องการ"></textarea>
    ` : ''}
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">ปิด</button>
    ${['contract_pending','member_confirmed','active','completed'].includes(x.status) ? `
      <button class="btn btn-primary" onclick="printOfficialFormModal(${id})">${icon('printer')} พิมพ์ชุดเอกสารสัญญาให้เซ็น</button>
    ` : ''}
    ${['submitted','committee_review'].includes(x.status) ? `
      <button class="btn btn-warning" onclick="committeeDecision(${id},'revision')">${icon('arrow-return-left')} ส่งกลับแก้ไข</button>
      <button class="btn btn-primary" onclick="committeeDecision(${id},'approve')">${icon('arrow-right-circle')} ผ่านและส่งประธาน</button>
    ` : ''}
  `);
}
async function committeeDecision(id,d){const r=await api('api/requests.php?action=committee_decision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,decision:d==='approve'?'approve':'revision',note:$('#decision-note')?.value||''})});if(r){closeModal();nav('requests')}}
async function approvals(c){
  const r = await api('api/requests.php?action=list&status=president_review');
  state.requests = r?.data || [];
  c.innerHTML = `<div class="card">
    <div class="card-header">
      <div>
        <h2 class="card-title">คำขอรอประธานพิจารณาอนุมัติ</h2>
        <p class="card-subtitle">พิจารณาหลังจากคณะกรรมการกลั่นกรองแล้ว สามารถดูสัญญาและอนุมัติสัญญาได้ทันที</p>
      </div>
    </div>
    ${state.requests.length ? `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>สมาชิก</th>
              <th>ยอดเงิน</th>
              <th>วัตถุประสงค์</th>
              <th>วันที่ยื่น</th>
              <th>การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            ${state.requests.map(x => `
              <tr>
                <td><strong>${esc(x.fullname)}</strong><div class="small text-muted">${esc(x.username || '')}</div></td>
                <td>${money(x.amount_requested)}</td>
                <td>${esc(x.purpose)}</td>
                <td>${new Date(x.created_at).toLocaleDateString('th-TH')}</td>
                <td>
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    <button class="btn btn-primary btn-sm" onclick="presidentRequest(${x.id})">${icon('file-earmark-check')} พิจารณา</button>
                    <button class="btn btn-secondary btn-sm" onclick="printOfficialFormModal(${x.id})">${icon('printer')} ดูร่างสัญญา</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : empty('ไม่มีคำขอรอพิจารณา', 'file-earmark-check')}
  </div>`;
}
async function presidentRequest(id){
  const r = await api('api/requests.php?action=detail&id=' + id);
  if (!r) return;
  const x = r.data;
  openModal('พิจารณาคำขอ #' + id, `
    <div class="notice">สมาชิก <strong>${esc(x.member_name)}</strong> ขอวงเงิน <strong>${money(x.amount_requested)} บาท</strong> (โครงการประชารัฐ)</div>
    <div class="section-title">รายการปัจจัยการผลิต</div>
    ${(x.items || []).map(i => `
      <div class="receipt-row">
        <span>${esc(i.item_name_snapshot)} × ${i.quantity}</span>
        <strong>${money(i.line_total)}</strong>
      </div>
    `).join('')}
    <div class="section-title">ผู้ค้ำประกัน</div>
    ${(x.guarantors || []).map(g => `
      <div class="notice" style="margin-bottom:6px">
        ${esc(g.guarantor_no)}. <strong>${esc(g.fullname)}</strong> · เลขบัตร: ${esc(g.national_id || '-')} · โทร: ${esc(g.phone || '-')}
      </div>
    `).join('') || empty('ไม่มีข้อมูลผู้ค้ำประกัน', 'people')}
    <div class="section-title">หมายเหตุประธาน</div>
    <textarea id="pres-note" class="form-control" placeholder="บันทึกข้อสังเกตหรือคำสั่งอนุมัติ"></textarea>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">ปิด</button>
    <button class="btn btn-secondary" onclick="printOfficialFormModal(${id})">${icon('printer')} พิมพ์ร่างสัญญา</button>
    <button class="btn btn-warning" onclick="presidentDecision(${id},'reject')">${icon('arrow-return-left')} ส่งกลับแก้ไข</button>
    <button class="btn btn-primary" onclick="presidentDecision(${id},'approve')">${icon('check2-circle')} อนุมัติคำขอ</button>
  `);
}
async function presidentDecision(id,d){const r=await api('api/requests.php?action=president_decision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,decision:d,note:$('#pres-note')?.value||''})});if(r){closeModal();nav('approvals')}}
async function receivingInspection(batchId){const r=await api('api/procurement.php?action=receiving_detail&batch_id='+batchId);if(!r)return;const b=r.data;openModal('ตรวจรับสินค้าจากการจัดซื้อ',`<div class="notice"><strong>${esc(b.title)}</strong><br>รอบ ${esc(b.batch_no)} · ตรวจสอบของจริงก่อนรับเข้ากองทุน</div><div class="table-wrap mobile-stack-table receiving-inspection-table"><table class="table"><thead><tr><th>สินค้า</th><th>จำนวนตามสั่ง</th><th>จำนวนที่ตรวจนับ</th><th>สภาพ</th></tr></thead><tbody>${b.items.map(i=>`<tr><td>${esc(i.item_name_snapshot)}</td><td data-expected="${i.quantity_ordered}">${money(i.quantity_ordered)} ${esc(i.unit_snapshot)}</td><td><input class="form-control recv-count" data-id="${i.id}" value="${i.quantity_counted||i.quantity_ordered}" type="number" min="0" step="0.01"></td><td><select class="form-control recv-condition" data-id="${i.id}"><option value="good" ${i.condition_status==='good'?'selected':''}>ปกติ</option><option value="damaged" ${i.condition_status==='damaged'?'selected':''}>ชำรุด</option><option value="short" ${i.condition_status==='short'?'selected':''}>จำนวนไม่ครบ</option><option value="wrong_item" ${i.condition_status==='wrong_item'?'selected':''}>รายการไม่ตรง</option></select></td></tr>`).join('')}</tbody></table></div><div class="form-group"><label class="form-label">หมายเหตุการตรวจรับ</label><textarea class="form-control" id="receiving-note" rows="3" placeholder="ระบุปัญหาหรือรายละเอียดเพิ่มเติมถ้ามี"></textarea></div>`,`<button class="btn btn-secondary" onclick="closeModal()">ปิด</button><button class="btn btn-primary" onclick="submitReceivingInspection(${batchId})">${icon('clipboard-check')}บันทึกผลตรวจรับ</button>`)}
async function submitReceivingInspection(batchId){const items=[...document.querySelectorAll('.recv-count')].map(x=>{const id=x.dataset.id;return{batch_item_id:Number(id),quantity_expected:Number(x.closest('tr').querySelector('td[data-expected]').dataset.expected),quantity_counted:Number(x.value),condition_status:document.querySelector('.recv-condition[data-id="'+id+'"]').value}});const r=await api('api/procurement.php?action=inspect_receiving',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({batch_id:batchId,items,received_note:$('#receiving-note')?.value||''})});if(r){closeModal();toast(r.message||'บันทึกผลตรวจรับแล้ว','success');nav('procurement')}}

async function myDeliveries(c){const memberId=state.stationContext&&state.stationMember?Number(state.stationMember.id):null;const r=await api('api/procurement.php?action=member_deliveries'+(memberId?'&member_id='+memberId:''));const rows=r?.data||[];c.innerHTML=`<div class="card"><div class="card-header"><div><h2 class="card-title">การรับสินค้าของฉัน</h2><p class="card-subtitle">ติดตามสถานะสินค้าที่ได้รับอนุมัติและกำหนดให้มารับ</p></div><button class="btn btn-secondary btn-sm" onclick="${state.stationContext ? "nav('station')" : "nav('dashboard')"}">${icon('arrow-left')}${state.stationContext ? 'กลับหน้า Station' : 'กลับหน้าภาพรวม'}</button></div>${rows.length?`<div class="grid grid-2">${rows.map(x=>`<div class="card" style="border:1px solid var(--border);box-shadow:none"><div class="card-header"><div><h3 class="card-title">${esc(x.batch_title||'รอบจัดซื้อ')}</h3><p class="card-subtitle">${esc(x.batch_no||'-')} · ${esc(x.request_no||'คำขอ')}</p></div>${x.delivery_status==='delivered'?'<span class="badge badge-success">รับแล้ว</span>':x.delivery_status==='partial'?'<span class="badge badge-warning">รับบางส่วน</span>':'<span class="badge badge-info">พร้อมรับ</span>'}</div><div class="notice">${esc(x.announcement_text||'สินค้าของคุณอยู่ระหว่างการเตรียมการ')}</div><div class="small text-muted" style="margin-top:10px">${x.delivery_date?'รับสินค้าเมื่อ '+esc(x.delivery_date):'กรุณาติดต่อสำนักงานกองทุนเมื่อมีประกาศพร้อมรับสินค้า'}</div></div>`).join('')}</div>`:empty('ยังไม่มีรายการสินค้าที่พร้อมรับหรือรอประกาศ','box-seam')}</div>`}

async function myPayments(c){const member=state.stationMember||state.user;const s=await api('api/payments.php?action=summary&member_id='+(state.stationMember?member.id:''));const p=await api('api/payments.php?action=list&member_id='+(state.stationMember?member.id:''));const req=await api('api/requests.php?action=list&member_id='+(state.stationMember?member.id:''));const payable=(req?.data||[]).filter(x=>['member_confirmed','active'].includes(x.status));c.innerHTML=`${state.stationMember?`<div class="station-banner"><strong>${icon('person-workspace')} กำลังดำเนินการแทน ${esc(member.fullname)}</strong><button class="btn btn-secondary btn-sm" onclick="nav('station')">กลับ Station</button></div>`:''}<div class="grid grid-3"><div class="stat-card"><div class="stat-label">ยอดตามแผน</div><div class="stat-value">${money(s?.data?.total)}</div></div><div class="stat-card"><div class="stat-label">ชำระแล้ว</div><div class="stat-value text-success">${money(s?.data?.paid)}</div></div><div class="stat-card"><div class="stat-label">คงเหลือ</div><div class="stat-value">${money(s?.data?.remaining)}</div></div></div><div class="card" style="margin-top:18px"><div class="card-header"><div><h2 class="card-title">บันทึกการชำระคืน</h2><p class="card-subtitle">รองรับทั้งโอนเงินพร้อมหลักฐาน และเงินสดผ่านคณะกรรมการ</p></div></div>${payable.length?`<div class="grid grid-2">${payable.map(x=>`<button class="btn btn-secondary" onclick="showPaymentForm(${x.id})">${icon('cash-stack')}บันทึกการชำระ · คำขอ #${x.id}</button>`).join('')}</div>`:empty('ยังไม่มีสัญญาที่พร้อมชำระคืน','cash-stack')}</div><div class="card"><div class="card-header"><h2 class="card-title">ประวัติการชำระ</h2></div>${(p?.data||[]).length?`<div class="table-wrap"><table class="table"><thead><tr><th>วันที่</th><th>จำนวน</th><th>ช่องทาง</th><th>สถานะ</th><th>หลักฐาน</th></tr></thead><tbody>${p.data.map(x=>`<tr><td>${esc(x.payment_date)}</td><td>${money(x.amount)}</td><td>${x.payment_channel==='cash'?'เงินสด':'โอนเงิน'}</td><td>${x.status==='verified'?'<span class="badge badge-success">ยืนยันแล้ว</span>':x.status==='pending'?'<span class="badge badge-warning">รอตรวจ</span>':'<span class="badge badge-danger">ไม่ผ่าน</span>'}</td><td>${x.slip_file?icon('paperclip'):'-'} ${x.status==='verified'&&x.receipt_number?`<button class="btn btn-secondary btn-sm" onclick="showReceipt(${x.id})">${icon('printer')}หลักฐาน</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:empty('ยังไม่มีประวัติการชำระ','receipt')}</div>`}
function showPaymentForm(requestId){openModal('บันทึกการชำระคืน',`<form id="payment-form" enctype="multipart/form-data"><input type="hidden" id="pay-request" value="${requestId}"><div class="form-group"><label class="form-label">ช่องทางการชำระ</label><select class="form-select" id="payment-channel"><option value="transfer">โอนเงิน</option><option value="cash">เงินสดที่สำนักงานกองทุน</option></select></div><div class="form-group"><label class="form-label">จำนวนเงิน</label><input class="form-control" id="payment-amount" type="number" min="0.01" step="0.01" required></div><div class="form-group"><label class="form-label">วันที่ชำระ</label><input class="form-control" id="payment-date" type="date" value="${new Date().toISOString().slice(0,10)}" required></div><div id="slip-field" class="form-group"><label class="form-label">หลักฐานการโอน</label><input class="form-control" id="payment-slip" type="file" accept="image/jpeg,image/png,application/pdf"><div class="form-help">JPG, PNG หรือ PDF ขนาดไม่เกิน 5MB</div></div><button class="btn btn-primary btn-block">${icon('send')}บันทึกการชำระ</button></form>`);$('#payment-channel').addEventListener('change',()=>$('#slip-field').classList.toggle('hidden',$('#payment-channel').value==='cash'));$('#payment-form').addEventListener('submit',submitPayment)}
async function submitPayment(e){e.preventDefault();const fd=new FormData();fd.append('request_id',$('#pay-request').value);fd.append('amount',$('#payment-amount').value);fd.append('payment_date',$('#payment-date').value);fd.append('payment_channel',$('#payment-channel').value);if(state.stationMember)fd.append('member_id',state.stationMember.id);if($('#payment-slip').files[0])fd.append('slip',$('#payment-slip').files[0]);const r=await api('api/payments.php?action=submit',{method:'POST',body:fd});if(r){closeModal();nav('my_payments')}}
async function showReceipt(id){
  const r = await api('api/payments.php?action=receipt&id=' + id);
  if (!r) return;
  const x = r.data;
  const receiptHtml = `
    <div class="receipt" id="receipt-print-box">
      <div class="receipt-title">ใบเสร็จรับเงิน / ใบรับชำระเงิน</div>
      <div style="text-align:center;font-weight:700;color:var(--primary);margin-top:2px">กองทุนหมู่บ้านแม่ยางตาล หมู่ที่ ๕</div>
      <div style="text-align:center;color:#555;font-size:12px;margin:2px 0 16px">โครงการประชารัฐ ปุ๋ย ยา และเมล็ดพันธุ์ ต.แม่ยางตาล อ.ร้องกวาง จ.แพร่</div>
      <div class="receipt-row"><span>เลขที่ใบเสร็จ</span><strong>${esc(x.receipt_number || '-')}</strong></div>
      <div class="receipt-row"><span>ชื่อสมาชิกผู้ชำระ</span><strong>${esc(x.fullname)}</strong></div>
      <div class="receipt-row"><span>วันที่ชำระเงิน</span><strong>${esc(x.payment_date)}</strong></div>
      <div class="receipt-row"><span>ช่องทางการชำระ</span><strong>${x.payment_channel === 'cash' ? 'เงินสด ณ สำนักงานกองทุน' : 'โอนเงินเข้าบัญชีกองทุน'}</strong></div>
      <div class="receipt-row"><span>จำนวนเงินที่ชำระ</span><strong style="font-size:16px;color:var(--success)">${money(x.amount)} บาท</strong></div>
      <div class="receipt-row"><span>สถานะการตรวจสอบ</span><strong style="color:var(--success)">ยืนยันความถูกต้องเรียบร้อยแล้ว</strong></div>
      <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:20px;text-align:center">
        <div>
          <div style="margin-top:25px;border-bottom:1px dotted #333;width:80%;margin-left:auto;margin-right:auto"></div>
          <div style="margin-top:6px;font-size:12px">ลงชื่อ...................................................ผู้ชำระเงิน</div>
          <div style="font-size:11px;color:#666">(${esc(x.fullname)})</div>
        </div>
        <div>
          <div style="margin-top:25px;border-bottom:1px dotted #333;width:80%;margin-left:auto;margin-right:auto"></div>
          <div style="margin-top:6px;font-size:12px">ลงชื่อ...................................................ผู้รับเงิน</div>
          <div style="font-size:11px;color:#666">(เหรัญญิก / กรรมการกองทุนหมู่บ้าน)</div>
        </div>
      </div>
    </div>
  `;
  openModal('หลักฐานการชำระเงิน', receiptHtml, `
    <button class="btn btn-secondary" onclick="closeModal()">ปิด</button>
    <button class="btn btn-primary" onclick="printDocumentHtml(document.getElementById('receipt-print-box').outerHTML, 'ใบเสร็จรับเงิน')">
      ${icon('printer')} พิมพ์ใบเสร็จ
    </button>
  `);
}
async function payments(c){const r=await api('api/payments.php?action=list');state.payments=r?.data||[];c.innerHTML=`<div class="card"><div class="card-header"><div><h2 class="card-title">รายการชำระที่ต้องตรวจสอบ</h2><p class="card-subtitle">เงินสดถูกบันทึกเป็นหลักฐานโดยกรรมการ ส่วนการโอนต้องตรวจหลักฐาน</p></div></div>${state.payments.length?`<div class="table-wrap"><table class="table"><thead><tr><th>สมาชิก</th><th>วันที่</th><th>จำนวน</th><th>ช่องทาง</th><th>สถานะ</th><th></th></tr></thead><tbody>${state.payments.map(x=>`<tr><td>${esc(x.fullname)}</td><td>${esc(x.payment_date)}</td><td>${money(x.amount)}</td><td>${x.payment_channel==='cash'?'เงินสด':'โอนเงิน'}</td><td>${x.status==='pending'?'<span class="badge badge-warning">รอตรวจ</span>':x.status==='verified'?'<span class="badge badge-success">ยืนยันแล้ว</span>':'<span class="badge badge-danger">ไม่ผ่าน</span>'}</td><td>${x.status==='pending'?`<button class="btn btn-primary btn-sm" onclick="verifyPayment(${x.id})">${icon('check2')}ตรวจสอบ</button>`:x.status==='verified'&&x.receipt_number?`<button class="btn btn-secondary btn-sm" onclick="showReceipt(${x.id})">${icon('printer')}หลักฐาน</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:empty('ไม่มีรายการชำระรอตรวจ','receipt')}</div>`}
async function verifyPayment(id){openModal('ตรวจสอบการชำระเงิน',`<div class="form-group"><label class="form-label">หมายเหตุ</label><textarea id="verify-note" class="form-control"></textarea></div>`,`<button class="btn btn-danger" onclick="doVerify(${id},'invalid')">${icon('x-circle')}ไม่ผ่าน</button><button class="btn btn-primary" onclick="doVerify(${id},'verified')">${icon('check2-circle')}ยืนยันการชำระ</button>`)}
async function doVerify(id,status){const r=await api('api/payments.php?action=verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status,note:$('#verify-note')?.value||''})});if(r){closeModal();nav('payments')}}
async function members(c){
  const r = await api('api/members.php?action=list');
  state.members = r?.data || [];
  c.innerHTML = `<div class="card">
    <div class="card-header">
      <div>
        <h2 class="card-title">ข้อมูลสมาชิกและผู้ใช้งาน</h2>
        <p class="card-subtitle">ค้นหา แก้ไข นำเข้า และจัดการบัญชีสมาชิก / คณะกรรมการ / ประธานกองทุน</p>
      </div>
      <div class="toolbar">
        <button class="btn btn-secondary" onclick="showImportModal()">${icon('file-earmark-spreadsheet')}นำเข้าสมาชิก (Excel / CSV)</button>
        <button class="btn btn-primary" onclick="showMemberForm()">${icon('person-plus')}เพิ่มผู้ใช้งาน / สมาชิก</button>
      </div>
    </div>
    <div class="toolbar" style="margin-bottom:15px;gap:10px">
      <input id="member-search" class="form-control" style="max-width:350px" placeholder="ค้นหาชื่อ / username / เลขบัตร / โทรศัพท์" oninput="filterMemberTable()">
      <select id="member-role-filter" class="form-select" style="max-width:180px" onchange="filterMemberTable()">
        <option value="">บทบาททั้งหมด</option>
        <option value="member">สมาชิกกองทุน</option>
        <option value="committee">คณะกรรมการ</option>
        <option value="president">ประธานกองทุน</option>
      </select>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>ชื่อ-นามสกุล</th><th>Username</th><th>บทบาท</th><th>โทรศัพท์</th><th>เลขบัตร</th><th>สถานะ</th><th>บัญชี</th><th></th></tr></thead>
        <tbody id="member-tbody">${memberRows(state.members)}</tbody>
      </table>
    </div>
  </div>`;
}

function showImportModal(){
  openModal('นำเข้าข้อมูลสมาชิกจากไฟล์ (Excel / CSV)', `
    <div class="notice" style="margin-bottom:16px">
      รองรับไฟล์ <strong>.xlsx</strong> (Excel) หรือ <strong>.csv</strong> โดยคอลัมน์สำคัญคือ <strong>รหัสสมาชิก</strong> และ <strong>ชื่อ-นามสกุล</strong>
    </div>
    <div style="margin-bottom:16px">
      <a href="api/members.php?action=import_template" class="btn btn-secondary btn-sm" download="member_import_template.csv">
        ${icon('download')} ดาวน์โหลดแม่แบบไฟล์ CSV ตัวอย่าง
      </a>
    </div>
    <form id="import-member-form" enctype="multipart/form-data">
      <div class="form-group">
        <label class="form-label">เลือกไฟล์ (.xlsx หรือ .csv)</label>
        <input type="file" id="import-file" class="form-control" accept=".xlsx,.csv" required>
        <div class="form-help">กรณีไม่มีรหัสผ่านในไฟล์ ระบบจะตั้งรหัสผ่านเริ่มต้นเป็น <strong>123456</strong> อัตโนมัติ</div>
      </div>
      <div id="import-result-box" style="display:none;margin-top:14px"></div>
      <button class="btn btn-primary btn-block" type="submit" id="btn-do-import">${icon('upload')} เริ่มนำเข้าข้อมูล</button>
    </form>
  `, `<button class="btn btn-secondary" onclick="closeModal()">ปิด</button>`);

  $('#import-member-form').addEventListener('submit', async e => {
    e.preventDefault();
    const file = $('#import-file').files[0];
    if (!file) return toast('กรุณาเลือกไฟล์', 'error');

    const btn = $('#btn-do-import');
    btn.disabled = true;
    btn.innerHTML = `${icon('arrow-repeat')} กำลังนำเข้าข้อมูล...`;

    const fd = new FormData();
    fd.append('file', file);

    const r = await api('api/members.php?action=import', { method: 'POST', body: fd });
    btn.disabled = false;
    btn.innerHTML = `${icon('upload')} เริ่มนำเข้าข้อมูล`;

    if (r) {
      toast(r.message, 'success');
      const box = $('#import-result-box');
      if (box && r.summary) {
        box.style.display = 'block';
        box.innerHTML = `<div class="alert alert-success">
          <strong>ผลการนำเข้า:</strong> ทั้งหมด ${r.summary.total} รายการ | เพิ่มใหม่ ${r.summary.imported} | ปรับปรุง ${r.summary.updated} | ข้าม ${r.summary.skipped}
          ${r.summary.errors?.length ? `<div style="margin-top:6px;font-size:12px;color:var(--danger)">${r.summary.errors.join('<br>')}</div>` : ''}
        </div>`;
      }
      setTimeout(() => {
        closeModal();
        nav('members');
      }, 1500);
    }
  });
}
function roleBadge(r){
  const t = roleText(r);
  const b = r === 'president' ? 'primary' : (r === 'committee' ? 'info' : 'neutral');
  return `<span class="badge badge-${b}">${esc(t)}</span>`;
}
function memberRows(rows){
  return rows.map(x=>`<tr>
    <td><strong>${esc(x.fullname)}</strong></td>
    <td>${esc(x.username)}</td>
    <td>${roleBadge(x.role)}</td>
    <td>${esc(x.phone||'-')}</td>
    <td>${esc(x.national_id||'-')}</td>
    <td>${x.risk_status==='normal'?'<span class="badge badge-success">ปกติ</span>':`<span class="badge badge-warning">${esc(x.risk_status)}</span>`}</td>
    <td>${x.is_active?'<span class="badge badge-success">ใช้งาน</span>':'<span class="badge badge-neutral">ปิดใช้งาน</span>'}</td>
    <td><button class="btn btn-secondary btn-sm" onclick="showMemberForm(${x.id})">${icon('pencil')}แก้ไข</button></td>
  </tr>`).join('')||`<tr><td colspan="8">${empty('ไม่พบข้อมูล')}</td></tr>`;
}
function filterMemberTable(){
  const q = ($('#member-search')?.value || '').toLowerCase().trim();
  const rf = $('#member-role-filter')?.value || '';
  const filtered = state.members.filter(x => {
    if (rf && x.role !== rf) return false;
    if (!q) return true;
    return (x.fullname || '').toLowerCase().includes(q) ||
           (x.username || '').toLowerCase().includes(q) ||
           (x.national_id || '').toLowerCase().includes(q) ||
           (x.phone || '').toLowerCase().includes(q);
  });
  $('#member-tbody').innerHTML = memberRows(filtered);
}
function showMemberForm(id){
  const x = state.members.find(m => m.id == id);
  const isPresident = state.user?.role === 'president';
  const currentRole = x?.role || 'member';

  openModal(id ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน / สมาชิก', `
    <form id="member-form">
      <input type="hidden" id="m-id" value="${id || ''}">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">ชื่อผู้ใช้ (Username)</label>
          <input class="form-control" id="m-user" value="${esc(x?.username)}" required>
          <div class="form-help">ควรใช้ชื่อภาษาอังกฤษหรือรหัสสมาชิกที่จำง่าย ไม่ใช้เลขบัตรประชาชนเป็นรหัสผ่าน</div>
        </div>
        <div class="form-group">
          <label class="form-label">รหัสผ่าน ${id ? '(เว้นว่างถ้าไม่ต้องการเปลี่ยน)' : ''}</label>
          <input type="password" class="form-control" id="m-pass" ${id ? '' : 'required'}>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">ชื่อ-นามสกุล</label>
          <input class="form-control" id="m-name" value="${esc(x?.fullname)}" required>
        </div>
        <div class="form-group">
          <label class="form-label">บทบาท (สิทธิ์การใช้งาน)</label>
          <select class="form-select" id="m-role">
            <option value="member" ${currentRole === 'member' ? 'selected' : ''}>สมาชิกกองทุน</option>
            <option value="committee" ${currentRole === 'committee' ? 'selected' : ''}>คณะกรรมการ (แอดมินปกติ)</option>
            ${isPresident ? `<option value="president" ${currentRole === 'president' ? 'selected' : ''}>ประธานกองทุน (Superadmin)</option>` : ''}
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">เบอร์โทรศัพท์</label>
          <input class="form-control" id="m-phone" value="${esc(x?.phone)}">
        </div>
        <div class="form-group">
          <label class="form-label">เลขบัตรประชาชน</label>
          <input class="form-control" id="m-nid" maxlength="13" value="${esc(x?.national_id)}">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">สถานภาพสมรส</label>
          <select class="form-select" id="m-marital" onchange="const box=$('#m-spouse-box');if(box)box.style.display=this.value==='married'?'block':'none'">
            <option value="single" ${(!x?.marital_status || x?.marital_status === 'single' || x?.marital_status === 'โสด') ? 'selected' : ''}>โสด</option>
            <option value="married" ${(x?.marital_status === 'married' || x?.marital_status === 'สมรส') ? 'selected' : ''}>สมรส</option>
            <option value="widowed" ${(x?.marital_status === 'widowed' || x?.marital_status === 'หม้าย') ? 'selected' : ''}>หม้าย</option>
            <option value="divorced" ${(x?.marital_status === 'divorced' || x?.marital_status === 'หย่า' || x?.marital_status === 'หย่าร้าง') ? 'selected' : ''}>หย่าร้าง</option>
          </select>
        </div>
        <div class="form-group" id="m-spouse-box" style="${(x?.marital_status === 'married' || x?.marital_status === 'สมรส') ? '' : 'display:none'}">
          <label class="form-label">ชื่อคู่สมรส (กรณีสมรส)</label>
          <input class="form-control" id="m-spouse" value="${esc(x?.spouse_name || '')}" placeholder="ระบุชื่อคู่สมรส">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">สถานะความเสี่ยง</label>
          <select class="form-select" id="m-risk">
            <option value="normal" ${x?.risk_status === 'normal' ? 'selected' : ''}>ปกติ</option>
            <option value="suspended" ${x?.risk_status === 'suspended' ? 'selected' : ''}>พักชำระหนี้</option>
            <option value="deceased" ${x?.risk_status === 'deceased' ? 'selected' : ''}>เสียชีวิต</option>
          </select>
        </div>
        ${id ? `
        <div class="form-group">
          <label class="form-label">สถานะบัญชี</label>
          <select class="form-select" id="m-active">
            <option value="1" ${x?.is_active ? 'selected' : ''}>เปิดใช้งาน</option>
            <option value="0" ${!x?.is_active ? 'selected' : ''}>ปิดใช้งาน</option>
          </select>
        </div>` : ''}
      </div>
      <div class="form-group">
        <label class="form-label">ที่อยู่</label>
        <textarea class="form-control" id="m-address">${esc(x?.address)}</textarea>
      </div>
      <button class="btn btn-primary btn-block">${icon('save')}บันทึกข้อมูล</button>
    </form>
  `);
  $('#member-form').addEventListener('submit', saveMember);
}
async function saveMember(e){
  e.preventDefault();
  const id = $('#m-id').value;
  const d = {
    username: $('#m-user').value.trim(),
    fullname: $('#m-name').value.trim(),
    role: $('#m-role').value,
    phone: $('#m-phone').value.trim(),
    national_id: $('#m-nid').value.trim(),
    marital_status: $('#m-marital')?.value || 'single',
    spouse_name: $('#m-marital')?.value === 'married' ? $('#m-spouse')?.value.trim() : '',
    risk_status: $('#m-risk').value,
    address: $('#m-address').value
  };
  const activeEl = $('#m-active');
  if (activeEl) d.is_active = Number(activeEl.value);
  if ($('#m-pass').value) d.password = $('#m-pass').value;
  const r = await api('api/members.php?action=' + (id ? 'update' : 'create'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(id ? { ...d, id } : d)
  });
  if (r) {
    closeModal();
    nav('members');
  }
}
async function ledger(c){const year=new Date().getFullYear()+543;const r=await api('api/payments.php?action=ledger&year='+year);c.innerHTML=`<div class="grid grid-3"><div class="stat-card"><div class="stat-label">รายรับ</div><div class="stat-value text-success">${money(r?.total_income)}</div></div><div class="stat-card"><div class="stat-label">รายจ่าย</div><div class="stat-value text-danger">${money(r?.total_expense)}</div></div><div class="stat-card"><div class="stat-label">คงเหลือ</div><div class="stat-value">${money(r?.balance)}</div></div></div><div class="card" style="margin-top:18px"><div class="card-header"><div><h2 class="card-title">บัญชีรายรับ–รายจ่าย ปี ${year}</h2></div>${state.user.role==='committee'?`<button class="btn btn-primary" onclick="showLedgerForm()">${icon('plus-lg')}บันทึกรายการ</button>`:''}</div>${r?.data?.length?`<div class="table-wrap"><table class="table"><thead><tr><th>วันที่</th><th>ประเภท</th><th>รายละเอียด</th><th>จำนวนเงิน</th><th>อ้างอิง</th></tr></thead><tbody>${r.data.map(x=>`<tr><td>${esc(x.transaction_date)}</td><td>${x.type==='income'?'<span class="badge badge-success">รายรับ</span>':'<span class="badge badge-danger">รายจ่าย</span>'}</td><td>${esc(x.description)}</td><td>${money(x.amount)}</td><td>${esc(x.reference||'-')}</td></tr>`).join('')}</tbody></table></div>`:empty('ยังไม่มีรายการบัญชี','journal-text')}</div>`}
function showLedgerForm(){openModal('บันทึกรายการบัญชี',`<form id="ledger-form"><div class="form-grid"><div class="form-group"><label class="form-label">ประเภท</label><select class="form-select" id="l-type"><option value="income">รายรับ</option><option value="expense">รายจ่าย</option></select></div><div class="form-group"><label class="form-label">จำนวนเงิน</label><input class="form-control" id="l-amount" type="number" min="0.01" step="0.01" required></div></div><div class="form-group"><label class="form-label">วันที่</label><input class="form-control" id="l-date" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="form-group"><label class="form-label">รายละเอียด</label><input class="form-control" id="l-desc" required></div><div class="form-group"><label class="form-label">เลขที่อ้างอิง</label><input class="form-control" id="l-ref"></div><button class="btn btn-primary btn-block">${icon('save')}บันทึก</button></form>`);$('#ledger-form').addEventListener('submit',async e=>{e.preventDefault();const r=await api('api/payments.php?action=add_transaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:$('#l-type').value,amount:$('#l-amount').value,transaction_date:$('#l-date').value,description:$('#l-desc').value,reference:$('#l-ref').value})});if(r){closeModal();nav('ledger')}})}
// -------------------------------------------------------------
// Printing Engine for Official Documents & Receipts
// -------------------------------------------------------------
function printDocumentHtml(contentHtml, title = 'พิมพ์แบบฟอร์มเอกสาร') {
  let iframe = document.getElementById('app-print-frame');
  if (iframe) iframe.remove();

  iframe = document.createElement('iframe');
  iframe.id = 'app-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>${esc(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Sarabun', system-ui, -apple-system, sans-serif;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
      font-size: 13.5pt;
      line-height: 1.65;
    }
    .print-doc {
      width: 100%;
      margin: 0 auto;
      padding: 0;
    }
    .page-container {
      position: relative;
      min-height: 250mm;
      page-break-after: always;
      box-sizing: border-box;
    }
    .page-container:last-child {
      page-break-after: avoid;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
      height: 0;
      margin: 0;
      padding: 0;
    }
    .ktb-form-code {
      text-align: right;
      font-size: 11pt;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .ktb-title {
      text-align: center;
      font-size: 16.5pt;
      font-weight: 800;
      margin: 4px 0 10px 0;
    }
    .ktb-header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .ktb-header-table td {
      border: 0 !important;
      padding: 2px 0;
      font-size: 13pt;
    }
    .doc-p {
      text-indent: 2.8rem;
      text-align: justify;
      margin-bottom: 8px;
      font-size: 13.5pt;
      line-height: 1.65;
    }
    .doc-fill {
      border-bottom: 1px dotted #000;
      padding: 0 4px;
      font-weight: 600;
      display: inline;
    }
    .marginal-sign {
      position: absolute;
      right: -8mm;
      top: 48%;
      transform: rotate(90deg);
      transform-origin: right top;
      font-size: 8.5pt;
      color: #333;
      white-space: nowrap;
    }
    .sig-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      page-break-inside: avoid;
    }
    .sig-table td {
      border: 0 !important;
      text-align: center;
      vertical-align: top;
      padding: 8px 4px;
      font-size: 12.5pt;
      line-height: 1.5;
    }
    .official-report-header {
      text-align: center;
      margin-bottom: 16px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    .official-report-title {
      font-size: 16pt;
      font-weight: 800;
      margin: 4px 0 2px 0;
    }
    .official-report-sub {
      font-size: 12.5pt;
      color: #222;
      font-weight: 600;
    }
    .no-print, button, .toolbar, .btn, input, select {
      display: none !important;
    }
    table.doc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11pt;
      margin: 12px 0;
    }
    table.doc-table th, table.doc-table td {
      border: 1px solid #000;
      padding: 6px 8px;
    }
    table.doc-table th {
      background: #f2f2f2;
      font-weight: 700;
      text-align: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11pt;
      margin: 12px 0;
    }
    table th, table td {
      border: 1px solid #000;
      padding: 6px 8px;
    }
    table th {
      background: #f2f2f2;
      font-weight: 700;
      text-align: center;
    }
    .badge {
      border: 1px solid #333;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 9.5pt;
      font-weight: 600;
      display: inline-block;
    }
    .receipt {
      border: 2px solid #000;
      padding: 22px;
      border-radius: 4px;
      max-width: 650px;
      margin: 20px auto;
    }
    .receipt-title {
      text-align: center;
      font-size: 16pt;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      padding: 7px 0;
      border-bottom: 1px dashed #666;
      font-size: 11.5pt;
    }
    .receipt-row:last-child {
      border-bottom: 0;
    }
  </style>
</head>
<body>
  ${contentHtml}
</body>
</html>`);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
  }, 400);
}

function getKtbLogoSvg(size = 56){
  return `<svg width="${size}" height="${Math.round(size*0.82)}" viewBox="0 0 60 50" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto 6px auto;">
    <rect x="7" y="2" width="12" height="6" fill="#000" rx="1"/>
    <rect x="24" y="2" width="12" height="6" fill="#000" rx="1"/>
    <rect x="41" y="2" width="12" height="6" fill="#000" rx="1"/>
    <rect x="7" y="10" width="12" height="26" fill="#000" rx="1"/>
    <text x="13" y="29" fill="#fff" font-family="'Sarabun', sans-serif" font-weight="900" font-size="16" text-anchor="middle">ก</text>
    <rect x="24" y="10" width="12" height="26" fill="#000" rx="1"/>
    <text x="30" y="29" fill="#fff" font-family="'Sarabun', sans-serif" font-weight="900" font-size="16" text-anchor="middle">ท</text>
    <rect x="41" y="10" width="12" height="26" fill="#000" rx="1"/>
    <text x="47" y="29" fill="#fff" font-family="'Sarabun', sans-serif" font-weight="900" font-size="16" text-anchor="middle">บ</text>
    <rect x="7" y="38" width="12" height="6" fill="#000" rx="1"/>
    <rect x="24" y="38" width="12" height="6" fill="#000" rx="1"/>
    <rect x="41" y="38" width="12" height="6" fill="#000" rx="1"/>
  </svg>`;
}

function toThaiDigits(val){
  const arabic = ['0','1','2','3','4','5','6','7','8','9'];
  const thai = ['๐','๑','๒','๓','๔','๕','๖','๗','๘','๙'];
  let str = String(val ?? '');
  for (let i = 0; i < 10; i++) {
    str = str.replaceAll(arabic[i], thai[i]);
  }
  return str;
}

function getThaiDateParts(dStr){
  const d = dStr ? new Date(dStr) : new Date();
  const thMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const day = d.getDate();
  const month = thMonths[d.getMonth()];
  const year = d.getFullYear() + 543;
  return {
    day: toThaiDigits(day),
    month,
    year: toThaiDigits(year),
    full: `${toThaiDigits(day)} เดือน ${month} พ.ศ. ${toThaiDigits(year)}`
  };
}

function parseAddressParts(addrStr){
  const str = addrStr || '';
  let no = '', moo = '', sub = 'แม่ยางตาล', dist = 'ร้องกวาง', prov = 'แพร่';
  const mNo = str.match(/(\d+[\d\/]*)/);
  if (mNo) no = mNo[1];
  const mMoo = str.match(/หมู่(?:\s*ที่)?\s*(\d+)/);
  if (mMoo) moo = mMoo[1];
  return {
    no: no ? toThaiDigits(no) : '๑๒',
    moo: moo ? toThaiDigits(moo) : '๕',
    sub,
    dist,
    prov
  };
}

async function printOfficialAnnualReport(year){
  const r = await api(`api/reports.php?action=annual&year=${year}`);
  if (!r) return toast('ไม่สามารถโหลดข้อมูลรายงานได้', 'error');
  const dt = getThaiDateParts();
  const cats = (r.by_category || []).map(x => ({
    label: x.category === 'fertilizer' ? 'ปุ๋ยเคมีและปุ๋ยอินทรีย์' : x.category === 'medicine' ? 'สารเคมีและเวชภัณฑ์ทางการเกษตร' : x.category === 'seed' ? 'เมล็ดพันธุ์พืช' : 'อุปกรณ์และปัจจัยการผลิตอื่น ๆ',
    amount: Number(x.amount) || 0,
    qty: Number(x.quantity) || 0
  }));

  const html = `
    <div class="print-doc page-container">
      <div class="official-report-header">
        ${getKtbLogoSvg(62)}
        <div class="official-report-title">รายงานสรุปผลการดำเนินงานโครงการเงินกู้ยืมเพื่อการผลิต (ปุ๋ย ยา และเมล็ดพันธุ์)</div>
        <div class="official-report-sub">กองทุนหมู่บ้านแม่ยางตาล หมู่ที่ ๕ ตำบลแม่ยางตาล อำเภอร้องกวาง จังหวัดแพร่</div>
        <div style="font-size:11.5pt;margin-top:4px">ประจำปีงบประมาณ พ.ศ. ${toThaiDigits(year)} · ข้อมูล ณ วันที่ ${dt.full}</div>
      </div>

      <div style="font-weight:700;font-size:12.5pt;margin-top:14px">ส่วนที่ ๑: สรุปภาพรวมการบริหารเงินทุนหมุนเวียนและลูกหนี้เงินกู้</div>
      <table class="doc-table">
        <thead>
          <tr>
            <th>รายการตัวชี้วัด</th>
            <th>จำนวนราย / คำขอ</th>
            <th>จำนวนเงิน (บาท)</th>
            <th>หมายเหตุ / สัดส่วน</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>จำนวนสมาชิกทั้งหมดในระบบ</td>
            <td style="text-align:center">${toThaiDigits(r.member_count)} ราย</td>
            <td style="text-align:right">-</td>
            <td>สมาชิกกองทุนหมู่บ้าน ม.๕</td>
          </tr>
          <tr>
            <td>คำขอกู้ยืมเงินที่ยื่นในปีงบประมาณ</td>
            <td style="text-align:center">${toThaiDigits(r.summary.total)} คำขอ</td>
            <td style="text-align:right">${money(r.summary.requested_amount)}</td>
            <td>รวมทุกสถานะ</td>
          </tr>
          <tr>
            <td>คำขอที่ผ่านการอนุมัติและทำสัญญา</td>
            <td style="text-align:center">${toThaiDigits(r.summary.approved || 0)} สัญญา</td>
            <td style="text-align:right">${money(r.principal)}</td>
            <td>เงินต้นที่ปล่อยกู้จริง</td>
          </tr>
          <tr>
            <td>ประมาณการดอกเบี้ยรับตามสัญญา (๖% ต่อปี)</td>
            <td style="text-align:center">-</td>
            <td style="text-align:right">${money(r.interest)}</td>
            <td>ผลตอบแทนเข้ากองทุน</td>
          </tr>
          <tr>
            <td><strong>ยอดเงินต้นรวมดอกเบี้ยที่ต้องชำระคืน (ตามแผน)</strong></td>
            <td style="text-align:center">-</td>
            <td style="text-align:right"><strong>${money(r.payable)}</strong></td>
            <td><strong>รวมยอดหนี้ทั้งสิ้น</strong></td>
          </tr>
          <tr>
            <td><strong>ยอดเงินที่รับชำระคืนแล้วจริง</strong></td>
            <td style="text-align:center">-</td>
            <td style="text-align:right"><strong style="color:#000">${money(r.paid)}</strong></td>
            <td><strong>อัตราการชำระคืน ${toThaiDigits(r.repayment_rate)}%</strong></td>
          </tr>
          <tr>
            <td>ยอดลูกหนี้คงค้างตามสัญญา</td>
            <td style="text-align:center">-</td>
            <td style="text-align:right">${money(r.remaining)}</td>
            <td>อยู่ระหว่างติดตามชำระ</td>
          </tr>
        </tbody>
      </table>

      <div style="font-weight:700;font-size:12.5pt;margin-top:16px">ส่วนที่ ๒: สรุปการจัดซื้อและส่งมอบปัจจัยการผลิตจำแนกตามประเภท</div>
      <table class="doc-table">
        <thead>
          <tr>
            <th style="width:8%">ลำดับ</th>
            <th>หมวดหมู่ปัจจัยการผลิต</th>
            <th style="width:20%">ปริมาณรวม</th>
            <th style="width:25%">มูลค่ารวม (บาท)</th>
            <th style="width:18%">สัดส่วน (%)</th>
          </tr>
        </thead>
        <tbody>
          ${cats.map((c, i) => {
            const pct = r.principal > 0 ? ((c.amount / r.principal) * 100).toFixed(1) : '0';
            return `
              <tr>
                <td style="text-align:center">${toThaiDigits(i + 1)}</td>
                <td><strong>${esc(c.label)}</strong></td>
                <td style="text-align:center">${money(c.qty)} หน่วย</td>
                <td style="text-align:right">${money(c.amount)}</td>
                <td style="text-align:center">${toThaiDigits(pct)}%</td>
              </tr>
            `;
          }).join('')}
          <tr>
            <td colspan="3" style="text-align:right;font-weight:700">รวมมูลค่าปัจจัยการผลิตทั้งสิ้น</td>
            <td style="text-align:right;font-weight:700">${money(r.principal)}</td>
            <td style="text-align:center;font-weight:700">๑๐๐%</td>
          </tr>
        </tbody>
      </table>

      <div style="font-weight:700;font-size:12.5pt;margin-top:16px">ส่วนที่ ๓: สถานะบัญชีรายรับ-รายจ่ายของกองทุน (ปีงบประมาณ ${toThaiDigits(year)})</div>
      <table class="doc-table">
        <thead>
          <tr>
            <th>ประเภทบัญชี</th>
            <th>จำนวนเงิน (บาท)</th>
            <th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          ${(r.ledger || []).map(l => `
            <tr>
              <td>${l.type === 'income' ? 'รายรับรวมโครงการ' : 'รายจ่ายรวมโครงการ'}</td>
              <td style="text-align:right">${money(l.amount)}</td>
              <td>${l.type === 'income' ? 'เงินจัดสรรรัฐบาล ค่าธรรมเนียม ดอกเบี้ยรับ' : 'ค่าจัดซื้อปัจจัยการผลิตและบริหารงาน'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <table class="sig-table" style="margin-top:40px">
        <tr>
          <td style="width:33.3%">
            ลงชื่อ............................................................ผู้จัดทำรายงาน<br>
            ( นายประสิทธิ์ มงคลสุข )<br>
            ตำแหน่ง เหรัญญิกกองทุนหมู่บ้าน
          </td>
          <td style="width:33.3%">
            ลงชื่อ............................................................ผู้ตรวจสอบรายงาน<br>
            ( นางอำไพ แก้วทอง )<br>
            ตำแหน่ง ประธานฝ่ายตรวจสอบ
          </td>
          <td style="width:33.3%">
            ลงชื่อ............................................................ผู้รับรองรายงาน<br>
            ( นายสมเกียรติ ยางตาล )<br>
            ตำแหน่ง ประธานกองทุนหมู่บ้าน
          </td>
        </tr>
      </table>
    </div>
  `;
  printDocumentHtml(html, `รายงานสรุปประจำปี ${year}`);
}

async function printOfficialMemberRoster(year){
  const r = await api(`api/reports.php?action=member_annual_list&year=${year}`);
  const list = r?.data || [];
  const dt = getThaiDateParts();

  const html = `
    <div class="print-doc page-container">
      <div class="official-report-header">
        ${getKtbLogoSvg(62)}
        <div class="official-report-title">ทะเบียนสมาชิกและการกู้ยืมเงินทุนหมุนเวียน</div>
        <div class="official-report-sub">กองทุนหมู่บ้านแม่ยางตาล หมู่ที่ ๕ ตำบลแม่ยางตาล อำเภอร้องกวาง จังหวัดแพร่</div>
        <div style="font-size:11.5pt;margin-top:4px">ประจำปีงบประมาณ พ.ศ. ${toThaiDigits(year)} · สมาชิกทั้งหมด ${toThaiDigits(list.length)} ราย · ข้อมูล ณ วันที่ ${dt.full}</div>
      </div>

      <table class="doc-table">
        <thead>
          <tr>
            <th style="width:6%">ลำดับ</th>
            <th style="width:12%">รหัสสมาชิก</th>
            <th>ชื่อ-นามสกุล สมาชิก</th>
            <th style="width:18%">เลขประจำตัวประชาชน</th>
            <th style="width:15%">วงเงินกู้ยืม (บาท)</th>
            <th style="width:15%">ชำระคืนแล้ว (บาท)</th>
            <th style="width:15%">หนี้คงค้าง (บาท)</th>
            <th style="width:12%">สถานะคำขอ</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((m, i) => `
            <tr>
              <td style="text-align:center">${toThaiDigits(i + 1)}</td>
              <td style="text-align:center">${esc(m.username)}</td>
              <td><strong>${esc(m.fullname)}</strong></td>
              <td style="text-align:center">${esc(m.national_id || '-')}</td>
              <td style="text-align:right">${money(m.amount_requested)}</td>
              <td style="text-align:right">${money(m.total_paid)}</td>
              <td style="text-align:right">${money(m.remaining_debt)}</td>
              <td style="text-align:center">${esc(statusMap[m.request_status]?.[0] || 'ยังไม่ยื่น')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <table class="sig-table" style="margin-top:35px">
        <tr>
          <td style="width:50%">
            ลงชื่อ............................................................นายทะเบียนสมาชิก<br>
            ( นางอำไพ แก้วทอง )<br>
            ตำแหน่ง กรรมการและนายทะเบียน
          </td>
          <td style="width:50%">
            ลงชื่อ............................................................ผู้รับรองทะเบียน<br>
            ( นายสมเกียรติ ยางตาล )<br>
            ตำแหน่ง ประธานกองทุนหมู่บ้าน
          </td>
        </tr>
      </table>
    </div>
  `;
  printDocumentHtml(html, `ทะเบียนสมาชิกประจำปี ${year}`);
}

async function printOfficialIndividualMember(memberId){
  if (!memberId) return toast('กรุณาเลือกสมาชิก', 'error');
  const r = await api(`api/reports.php?action=member_detail&member_id=${memberId}`);
  if (!r || !r.member) return toast('ไม่สามารถโหลดข้อมูลสมาชิกได้', 'error');
  const m = r.member;
  const s = r.summary;
  const reqs = r.requests || [];
  const dt = getThaiDateParts();

  const html = `
    <div class="print-doc page-container">
      <div class="official-report-header">
        ${getKtbLogoSvg(62)}
        <div class="official-report-title">ประวัติสมาชิกและรายงานสถานะการกู้ยืมเงินทุนหมุนเวียนรายบุคคล</div>
        <div class="official-report-sub">กองทุนหมู่บ้านแม่ยางตาล หมู่ที่ ๕ ตำบลแม่ยางตาล อำเภอร้องกวาง จังหวัดแพร่</div>
        <div style="font-size:11.5pt;margin-top:4px">ข้อมูล ณ วันที่ ${dt.full}</div>
      </div>

      <div style="font-weight:700;font-size:12.5pt;margin-top:10px">ข้อมูลสมาชิกทั่วไป:</div>
      <table class="ktb-header-table" style="margin-top:6px">
        <tr>
          <td style="width:50%"><strong>รหัสสมาชิก:</strong> ${esc(m.username)}</td>
          <td style="width:50%"><strong>ชื่อ-นามสกุล:</strong> ${esc(m.fullname)}</td>
        </tr>
        <tr>
          <td><strong>เลขประจำตัวประชาชน:</strong> ${esc(m.national_id || '-')}</td>
          <td><strong>เบอร์โทรศัพท์:</strong> ${esc(m.phone || '-')}</td>
        </tr>
        <tr>
          <td><strong>สถานภาพสมรส:</strong> ${esc(maritalText(m.marital_status))} ${m.spouse_name ? `(คู่สมรส: ${esc(m.spouse_name)})` : ''}</td>
          <td><strong>สถานะความเสี่ยง:</strong> ${esc(m.risk_status === 'normal' ? 'ปกติ' : m.risk_status)}</td>
        </tr>
        <tr>
          <td colspan="2"><strong>ที่อยู่ตามทะเบียนบ้าน:</strong> ${esc(m.address || '-')}</td>
        </tr>
      </table>

      <div style="font-weight:700;font-size:12.5pt;margin-top:14px">สรุปภาระหนี้สินและการชำระเงิน:</div>
      <table class="doc-table">
        <thead>
          <tr>
            <th>ยอดขอกู้รวม (บาท)</th>
            <th>ยอดหนี้ตามแผน (รวมดอกเบี้ย)</th>
            <th>ยอดที่ชำระคืนแล้ว (บาท)</th>
            <th>หนี้คงค้างสุทธิ (บาท)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:right"><strong>${money(s.total_requested)}</strong></td>
            <td style="text-align:right"><strong>${money(s.total_payable)}</strong></td>
            <td style="text-align:right"><strong style="color:#000">${money(s.total_paid)}</strong></td>
            <td style="text-align:right"><strong>${money(s.remaining_debt)}</strong></td>
          </tr>
        </tbody>
      </table>

      <div style="font-weight:700;font-size:12.5pt;margin-top:14px">ประวัติสัญญาและรายการปัจจัยการผลิตที่ได้รับมอบ:</div>
      ${reqs.map(q => `
        <div style="border:1px solid #000;padding:10px;margin-top:8px;border-radius:4px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <strong>คำขอเลขที่ #${q.id} (ปีงบประมาณ ${esc(q.year_be || '-')})</strong>
            <span>สถานะ: <strong>${esc(statusMap[q.status]?.[0] || q.status)}</strong></span>
          </div>
          <table class="doc-table" style="margin:6px 0">
            <thead>
              <tr>
                <th>รายการปัจจัยการผลิต</th>
                <th>จำนวน</th>
                <th>รวมเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              ${(q.items || []).map(it => `
                <tr>
                  <td>${esc(it.item_name_snapshot)}</td>
                  <td style="text-align:center">${it.quantity} ${esc(it.unit_snapshot)}</td>
                  <td style="text-align:right">${money(it.line_total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="font-size:10.5pt;margin-top:4px">
            <strong>ผู้ค้ำประกัน:</strong> ${(q.guarantors || []).map(g => `${g.fullname} (${g.national_id || '-'})`).join(', ') || '-'}
          </div>
        </div>
      `).join('') || '<div class="text-muted">ไม่มีประวัติคำขอ</div>'}

      <table class="sig-table" style="margin-top:35px">
        <tr>
          <td style="width:50%">
            ลงชื่อ............................................................สมาชิกผู้กู้<br>
            ( ${esc(m.fullname)} )
          </td>
          <td style="width:50%">
            ลงชื่อ............................................................ผู้รับรองข้อมูล<br>
            ( นายประสิทธิ์ มงคลสุข )<br>
            ตำแหน่ง เหรัญญิกกองทุนหมู่บ้าน
          </td>
        </tr>
      </table>
    </div>
  `;
  printDocumentHtml(html, `รายงานประวัติสมาชิก ${m.fullname}`);
}

async function printOfficialFinancialReport(year){
  const r = await api(`api/reports.php?action=financial_summary&year=${year}`);
  if (!r) return toast('ไม่สามารถโหลดข้อมูลการเงินได้', 'error');
  const loans = r.loans || {};
  const ledger = r.ledger || {};
  const inc = {
    total_income:  ledger.income   || 0,
    total_expense: ledger.expense  || 0,
    net_income:    ledger.balance  || 0,
  };
  const bal = {
    net_cash:              ledger.balance           || 0,
    total_loan_receivable: loans.total_outstanding  || 0,
    total_assets:          (ledger.balance || 0) + (loans.total_outstanding || 0),
  };
  const dt = getThaiDateParts();

  const html = `
    <div class="print-doc page-container">
      <div class="official-report-header">
        ${getKtbLogoSvg(62)}
        <div class="official-report-title">รายงานสถานะทางการเงินและบัญชีรายรับ-รายจ่าย</div>
        <div class="official-report-sub">กองทุนหมู่บ้านแม่ยางตาล หมู่ที่ ๕ ตำบลแม่ยางตาล อำเภอร้องกวาง จังหวัดแพร่</div>
        <div style="font-size:11.5pt;margin-top:4px">ประจำปีงบประมาณ พ.ศ. ${toThaiDigits(year)} · ข้อมูล ณ วันที่ ${dt.full}</div>
      </div>

      <div style="font-weight:700;font-size:12.5pt;margin-top:12px">งบรายรับ - รายจ่ายโครงการ (Cash Flow Statement):</div>
      <table class="doc-table">
        <thead>
          <tr>
            <th>หมวดรายการ</th>
            <th>จำนวนเงิน (บาท)</th>
            <th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>รายรับรวมทั้งสิ้น</strong></td>
            <td style="text-align:right"><strong>${money(inc.total_income)}</strong></td>
            <td>เงินจัดสรร, ค่าธรรมเนียม, ดอกเบี้ยรับ</td>
          </tr>
          <tr>
            <td><strong>รายจ่ายรวมทั้งสิ้น</strong></td>
            <td style="text-align:right"><strong>${money(inc.total_expense)}</strong></td>
            <td>ค่าจัดซื้อปัจจัยการผลิต, เบี้ยประชุม, ค่าวัสดุ</td>
          </tr>
          <tr>
            <td><strong>รายรับสุทธิ (Net Balance)</strong></td>
            <td style="text-align:right"><strong>${money(inc.net_income)}</strong></td>
            <td>ส่วนต่างรายรับเกินรายจ่าย</td>
          </tr>
        </tbody>
      </table>

      <div style="font-weight:700;font-size:12.5pt;margin-top:16px">งบดุลและสภาพคล่องกองทุน (Balance Sheet Overview):</div>
      <table class="doc-table">
        <thead>
          <tr>
            <th>รายการสินทรัพย์</th>
            <th>จำนวนเงิน (บาท)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>เงินสดในมือและเงินฝากธนาคารสุทธิ</td>
            <td style="text-align:right">${money(bal.net_cash)}</td>
          </tr>
          <tr>
            <td>ลูกหนี้เงินกู้ยืมโครงการประชารัฐคงค้างสุทธิ</td>
            <td style="text-align:right">${money(bal.total_loan_receivable)}</td>
          </tr>
          <tr>
            <td><strong>รวมสินทรัพย์หมุนเวียนทั้งสิ้น</strong></td>
            <td style="text-align:right"><strong>${money(bal.total_assets)}</strong></td>
          </tr>
        </tbody>
      </table>

      <table class="sig-table" style="margin-top:40px">
        <tr>
          <td style="width:33.3%">
            ลงชื่อ............................................................ผู้จัดทำงบ<br>
            ( นายประสิทธิ์ มงคลสุข )<br>
            ตำแหน่ง เหรัญญิกกองทุน
          </td>
          <td style="width:33.3%">
            ลงชื่อ............................................................ผู้ตรวจสอบบัญชี<br>
            ( นางอำไพ แก้วทอง )<br>
            ตำแหน่ง ประธานฝ่ายตรวจสอบ
          </td>
          <td style="width:33.3%">
            ลงชื่อ............................................................ผู้รับรองงบ<br>
            ( นายสมเกียรติ ยางตาล )<br>
            ตำแหน่ง ประธานกองทุนหมู่บ้าน
          </td>
        </tr>
      </table>
    </div>
  `;
  printDocumentHtml(html, `รายงานงบการเงินปี ${year}`);
}

async function printReportSection(elementId, title = 'รายงาน'){
  if (state.reportTab === 'annual') {
    return printOfficialAnnualReport(state.reportYear);
  } else if (state.reportTab === 'members') {
    if (state.memberSubTab === 'roster') {
      return printOfficialMemberRoster(state.reportYear);
    } else {
      return printOfficialIndividualMember(state.selectedReportMemberId);
    }
  } else if (state.reportTab === 'financial') {
    return printOfficialFinancialReport(state.reportYear);
  }
  const el = document.getElementById(elementId) || $('#report-tab-body');
  if (!el) return window.print();
  printDocumentHtml(el.innerHTML, title);
}

async function reports(c){
  state.reportTab = state.reportTab || 'annual';
  state.reportYear = state.reportYear || (new Date().getFullYear() + 543);
  state.memberSubTab = state.memberSubTab || 'roster';
  state.financialSubTab = state.financialSubTab || 'overview';

  c.innerHTML = `
    <div class="card">
      <div class="card-header no-print">
        <div>
          <h2 class="card-title">ศูนย์รายงานและเอกสารแบบฟอร์ม</h2>
          <p class="card-subtitle">รายงานสมาชิก รายงานการเงิน สรุปประจำปี และแบบฟอร์มเอกสารสำหรับพิมพ์</p>
        </div>
      </div>
      <div class="report-tabs no-print">
        <button class="report-tab-btn ${state.reportTab === 'annual' ? 'active' : ''}" onclick="switchReportTab('annual')">
          ${icon('calendar-check')} สรุปประจำปีงบประมาณ
        </button>
        <button class="report-tab-btn ${state.reportTab === 'members' ? 'active' : ''}" onclick="switchReportTab('members')">
          ${icon('people')} รายงานสมาชิก (รายบุคคล/ประจำปี)
        </button>
        <button class="report-tab-btn ${state.reportTab === 'financial' ? 'active' : ''}" onclick="switchReportTab('financial')">
          ${icon('cash-stack')} รายงานการเงิน (ภาพรวม/รายบุคคล)
        </button>
        <button class="report-tab-btn ${state.reportTab === 'forms' ? 'active' : ''}" onclick="switchReportTab('forms')">
          ${icon('file-earmark-text')} แบบฟอร์มพิมพ์เอกสาร/สัญญา
        </button>
      </div>
      <div id="report-tab-body"></div>
    </div>
  `;

  renderActiveReportTab();
}

function switchReportTab(tab){
  state.reportTab = tab;
  document.querySelectorAll('.report-tab-btn').forEach(b => b.classList.toggle('active', b.textContent.includes(
    tab === 'annual' ? 'สรุปประจำปี' : tab === 'members' ? 'รายงานสมาชิก' : tab === 'financial' ? 'รายงานการเงิน' : 'แบบฟอร์มพิมพ์'
  )));
  renderActiveReportTab();
}

async function renderActiveReportTab(){
  const body = $('#report-tab-body');
  if (!body) return;

  if (state.reportTab === 'annual') {
    return renderAnnualReport(body);
  } else if (state.reportTab === 'members') {
    return renderMembersReport(body);
  } else if (state.reportTab === 'financial') {
    return renderFinancialReport(body);
  } else if (state.reportTab === 'forms') {
    return renderFormsReport(body);
  }
}

// -------------------------------------------------------------
// 1. Annual Summary Report
// -------------------------------------------------------------
async function renderAnnualReport(container){
  container.innerHTML = `<div class="empty">${icon('arrow-repeat')} กำลังโหลดข้อมูลรายงาน...</div>`;
  const year = state.reportYear;
  const r = await api(`api/reports.php?action=annual&year=${year}`);
  if (!r) {
    container.innerHTML = empty('ไม่สามารถโหลดข้อมูลรายงานประจำปีได้');
    return;
  }

  const cats = (r.by_category || []).map(x => ({
    label: x.category === 'fertilizer' ? 'ปุ๋ย' : x.category === 'medicine' ? 'ยา' : x.category === 'seed' ? 'เมล็ดพันธุ์' : 'อื่น ๆ',
    amount: Number(x.amount) || 0,
    qty: Number(x.quantity) || 0
  }));

  container.innerHTML = `
    <div class="toolbar" style="margin-bottom:18px">
      <div style="display:flex;align-items:center;gap:10px">
        <label class="form-label" style="margin:0">ปีงบประมาณ:</label>
        <select class="form-select" id="rep-annual-year" style="width:130px" onchange="state.reportYear=Number(this.value);renderActiveReportTab()">
          ${[year, year-1, year-2, year+1].map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-secondary" onclick="printReportSection('report-tab-body', 'รายงานสรุปประจำปี')">${icon('printer')} พิมพ์รายงานสรุปประจำปี</button>
    </div>

    <div class="grid grid-4">
      <div class="stat-card">
        <div class="stat-icon">${icon('people')}</div>
        <div class="stat-label">สมาชิกทั้งหมด / ผู้กู้</div>
        <div class="stat-value">${r.member_count} / ${r.borrower_count}</div>
        <div class="stat-note">รายที่มีคำขอในปีนี้</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">${icon('file-earmark-text')}</div>
        <div class="stat-label">ยอดคำขอรวม</div>
        <div class="stat-value">${money(r.summary.requested_amount)}</div>
        <div class="stat-note">คำขออนุมัติ ${r.summary.approved || 0} รายการ</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">${icon('cash-stack')}</div>
        <div class="stat-label">รับชำระคืนแล้ว</div>
        <div class="stat-value text-success">${money(r.paid)}</div>
        <div class="stat-note">ชำระแล้ว ${r.repayment_rate}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">${icon('wallet2')}</div>
        <div class="stat-label">หนี้คงค้างรวม</div>
        <div class="stat-value text-danger">${money(r.remaining)}</div>
        <div class="stat-note">ตามแผน ${money(r.payable)} บาท</div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-top:18px">
      <div class="card" style="box-shadow:none;border:1px solid var(--border)">
        <h3 class="card-title">สรุปมูลค่าปัจจัยการผลิตตามประเภท</h3>
        <div style="margin-top:14px">
          ${cats.length ? cats.map(x => `
            <div class="receipt-row">
              <span><strong>${esc(x.label)}</strong> (ปริมาณ ${money(x.qty)})</span>
              <strong>${money(x.amount)} บาท</strong>
            </div>
          `).join('') : empty('ไม่มีข้อมูลรายการ')}
        </div>
      </div>
      <div class="card" style="box-shadow:none;border:1px solid var(--border)">
        <h3 class="card-title">กราฟสัดส่วนมูลค่าปัจจัยการผลิต</h3>
        <div style="height:260px;margin-top:12px">
          <canvas id="annual-category-chart" aria-label="กราฟมูลค่าคำขอตามประเภท" role="img"></canvas>
        </div>
      </div>
    </div>

    <div class="card" style="box-shadow:none;border:1px solid var(--border);margin-top:18px">
      <h3 class="card-title">สถานะบัญชีกองทุนประจำปี ${year} (Ledger)</h3>
      <div class="grid grid-2" style="margin-top:12px">
        ${(r.ledger || []).map(l => `
          <div class="receipt-row">
            <span>${l.type === 'income' ? '<span class="badge badge-success">รายรับรวม</span>' : '<span class="badge badge-danger">รายจ่ายรวม</span>'}</span>
            <strong>${money(l.amount)} บาท</strong>
          </div>
        `).join('') || '<div class="text-muted">ยังไม่มีรายการบัญชีในปีนี้</div>'}
      </div>
    </div>
  `;

  const canvas = document.getElementById('annual-category-chart');
  if (canvas && window.Chart && cats.length) {
    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: cats.map(x => x.label),
        datasets: [{
          data: cats.map(x => x.amount),
          backgroundColor: ['#176b3a', '#c9982e', '#2864a5', '#667085']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

// -------------------------------------------------------------
// 2. Members Report (Annual Roster + Individual History)
// -------------------------------------------------------------
async function renderMembersReport(container){
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm ${state.memberSubTab === 'roster' ? 'btn-primary' : 'btn-secondary'}" onclick="state.memberSubTab='roster';renderMembersReport($('#report-tab-body'))">
          ${icon('list-ul')} บัญชีสมาชิกประจำปี
        </button>
        <button class="btn btn-sm ${state.memberSubTab === 'individual' ? 'btn-primary' : 'btn-secondary'}" onclick="state.memberSubTab='individual';renderMembersReport($('#report-tab-body'))">
          ${icon('person-vcard')} ประวัติและรายงานสมาชิกรายบุคคล
        </button>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="printReportSection('member-subtab-content', 'รายงานสมาชิก')">${icon('printer')} พิมพ์รายงานนี้</button>
    </div>
    <div id="member-subtab-content"></div>
  `;

  const subContent = $('#member-subtab-content');
  if (state.memberSubTab === 'roster') {
    renderMemberRoster(subContent);
  } else {
    renderMemberIndividual(subContent);
  }
}

async function renderMemberRoster(container){
  container.innerHTML = `<div class="empty">${icon('arrow-repeat')} กำลังโหลดบัญชีสมาชิก...</div>`;
  const year = state.reportYear;
  const r = await api(`api/reports.php?action=member_annual_list&year=${year}`);
  const list = r?.data || [];

  container.innerHTML = `
    <div class="toolbar" style="margin-bottom:14px">
      <input id="roster-search" class="form-control" style="max-width:320px" placeholder="ค้นหาชื่อ / รหัส / เลขบัตร..." oninput="filterRosterTable()">
      <div class="small text-muted">สมาชิกทั้งหมด ${list.length} รายการ</div>
    </div>
    <div class="table-wrap">
      <table class="table" id="roster-table">
        <thead>
          <tr>
            <th>รหัส</th>
            <th>ชื่อ-นามสกุล</th>
            <th>เลขบัตรประชาชน</th>
            <th>โทรศัพท์</th>
            <th>ยอดกู้ปี ${year}</th>
            <th>ชำระแล้ว</th>
            <th>คงเหลือ</th>
            <th>สถานะความเสี่ยง</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="roster-tbody">
          ${renderRosterRows(list)}
        </tbody>
      </table>
    </div>
  `;

  window.rosterData = list;
}

function renderRosterRows(rows){
  if (!rows.length) return `<tr><td colspan="9">${empty('ไม่พบข้อมูลสมาชิก')}</td></tr>`;
  return rows.map(x => `
    <tr>
      <td><strong>${esc(x.username)}</strong></td>
      <td>${esc(x.fullname)}</td>
      <td>${esc(x.national_id || '-')}</td>
      <td>${esc(x.phone || '-')}</td>
      <td>${Number(x.amount_requested) > 0 ? money(x.amount_requested) + ' บาท' : '<span class="text-muted">-</span>'}</td>
      <td class="text-success">${money(x.total_paid)}</td>
      <td class="${Number(x.remaining_debt) > 0 ? 'text-danger fw-bold' : 'text-muted'}">${money(x.remaining_debt)}</td>
      <td>${x.risk_status === 'normal' ? '<span class="badge badge-success">ปกติ</span>' : `<span class="badge badge-warning">${esc(x.risk_status)}</span>`}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="viewIndividualReport(${x.id})">
          ${icon('eye')} ดูรายบุคคล
        </button>
      </td>
    </tr>
  `).join('');
}

function filterRosterTable(){
  const q = ($('#roster-search')?.value || '').toLowerCase().trim();
  const filtered = (window.rosterData || []).filter(x =>
    (x.fullname || '').toLowerCase().includes(q) ||
    (x.username || '').toLowerCase().includes(q) ||
    (x.national_id || '').includes(q) ||
    (x.phone || '').includes(q)
  );
  $('#roster-tbody').innerHTML = renderRosterRows(filtered);
}

function viewIndividualReport(memberId){
  state.memberSubTab = 'individual';
  state.selectedReportMemberId = memberId;
  renderMembersReport($('#report-tab-body'));
}

async function renderMemberIndividual(container){
  const mListRes = await api('api/members.php?action=list');
  const members = (mListRes?.data || []).filter(x => x.role === 'member');
  const selectedId = state.selectedReportMemberId || members[0]?.id;

  container.innerHTML = `
    <div class="toolbar" style="margin-bottom:16px">
      <label class="form-label" style="margin:0">เลือกสมาชิก:</label>
      <select class="form-select" style="max-width:350px" id="sel-report-member" onchange="state.selectedReportMemberId=Number(this.value);renderMemberIndividual($('#member-subtab-content'))">
        ${members.map(m => `<option value="${m.id}" ${m.id == selectedId ? 'selected' : ''}>${esc(m.fullname)} (${esc(m.username)})</option>`).join('')}
      </select>
    </div>
    <div id="member-individual-detail"></div>
  `;

  if (!selectedId) {
    $('#member-individual-detail').innerHTML = empty('ยังไม่มีข้อมูลสมาชิก');
    return;
  }

  const detailRes = await api(`api/reports.php?action=member_detail&member_id=${selectedId}`);
  if (!detailRes) {
    $('#member-individual-detail').innerHTML = empty('ไม่สามารถโหลดข้อมูลสมาชิกได้');
    return;
  }

  const m = detailRes.member;
  const s = detailRes.summary;
  const reqs = detailRes.requests || [];
  const gOthers = detailRes.guaranteed_for_others || [];

  $('#member-individual-detail').innerHTML = `
    <div class="grid grid-3">
      <div class="stat-card">
        <div class="stat-label">ยอดกู้ยืมรวมทุกปี</div>
        <div class="stat-value">${money(s.total_requested)}</div>
        <div class="stat-note">คำขอทั้งหมด ${reqs.length} ครั้ง</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">ชำระคืนแล้วรวม</div>
        <div class="stat-value text-success">${money(s.total_paid)}</div>
        <div class="stat-note">บาท</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">หนี้คงเหลือปัจจุบัน</div>
        <div class="stat-value text-danger">${money(s.remaining_debt)}</div>
        <div class="stat-note">บาท</div>
      </div>
    </div>

    <div class="card" style="box-shadow:none;border:1px solid var(--border);margin-top:16px">
      <div class="card-header">
        <h3 class="card-title">ข้อมูลส่วนตัวและสถานะ</h3>
        ${m.risk_status === 'normal' ? '<span class="badge badge-success">สถานะปกติ</span>' : `<span class="badge badge-warning">${esc(m.risk_status)}</span>`}
      </div>
      <div class="form-grid">
        <div><span class="text-muted small">ชื่อ-นามสกุล:</span> <strong>${esc(m.fullname)}</strong></div>
        <div><span class="text-muted small">รหัสสมาชิก:</span> <strong>${esc(m.username)}</strong></div>
        <div><span class="text-muted small">เลขประจำตัวประชาชน:</span> <strong>${esc(m.national_id || '-')}</strong></div>
        <div><span class="text-muted small">เบอร์โทรศัพท์:</span> <strong>${esc(m.phone || '-')}</strong></div>
        <div><span class="text-muted small">สถานภาพ:</span> <strong>${esc(maritalText(m.marital_status))}</strong> ${m.spouse_name ? `(คู่สมรส: ${esc(m.spouse_name)})` : ''}</div>
        <div><span class="text-muted small">ที่อยู่:</span> <strong>${esc(m.address || '-')}</strong></div>
      </div>
    </div>

    <div class="card" style="box-shadow:none;border:1px solid var(--border);margin-top:16px">
      <h3 class="card-title">ประวัติคำขอและสัญญาของสมาชิก</h3>
      ${reqs.length ? `
        <div class="table-wrap" style="margin-top:12px">
          <table class="table">
            <thead>
              <tr>
                <th>ปีงบประมาณ</th>
                <th>ยอดคำขอ</th>
                <th>ยอดตามแผน</th>
                <th>ชำระแล้ว</th>
                <th>คงเหลือ</th>
                <th>สถานะสัญญา</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${reqs.map(r => `
                <tr>
                  <td><strong>ปี ${esc(r.year_be || '-')}</strong></td>
                  <td>${money(r.amount_requested)} บาท</td>
                  <td>${money(r.total_payable)} บาท</td>
                  <td class="text-success">${money(r.total_paid)}</td>
                  <td class="${Number(r.remaining) > 0 ? 'text-danger fw-bold' : 'text-muted'}">${money(r.remaining)}</td>
                  <td>${badge(r.status)}</td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="printOfficialFormModal(${r.id})">
                      ${icon('printer')} พิมพ์สัญญา/คำขอ
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : empty('ไม่มีประวัติคำขอ')}
    </div>

    <div class="card" style="box-shadow:none;border:1px solid var(--border);margin-top:16px">
      <h3 class="card-title">ภาระการค้ำประกันให้สมาชิกท่านอื่น</h3>
      ${gOthers.length ? `
        <div class="table-wrap" style="margin-top:12px">
          <table class="table">
            <thead>
              <tr>
                <th>สมาชิกที่ไปค้ำให้</th>
                <th>รหัสผู้กู้</th>
                <th>ปีงบประมาณ</th>
                <th>วงเงินกู้</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              ${gOthers.map(g => `
                <tr>
                  <td><strong>${esc(g.borrower_name)}</strong></td>
                  <td>${esc(g.borrower_code)}</td>
                  <td>ปี ${esc(g.year_be || '-')}</td>
                  <td>${money(g.amount_requested)} บาท</td>
                  <td>${badge(g.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<div class="text-muted" style="padding:10px 0">สมาชิกท่านนี้ไม่ได้เป็นผู้ค้ำประกันให้สมาชิกรายอื่น</div>'}
    </div>
  `;
}

// -------------------------------------------------------------
// 3. Financial Report (Project Financials + Individual Statement)
// -------------------------------------------------------------
async function renderFinancialReport(container){
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm ${state.financialSubTab === 'overview' ? 'btn-primary' : 'btn-secondary'}" onclick="state.financialSubTab='overview';renderFinancialReport($('#report-tab-body'))">
          ${icon('pie-chart')} งบการเงินภาพรวมโครงการ
        </button>
        <button class="btn btn-sm ${state.financialSubTab === 'statement' ? 'btn-primary' : 'btn-secondary'}" onclick="state.financialSubTab='statement';renderFinancialReport($('#report-tab-body'))">
          ${icon('receipt-cutoff')} Statement การเงินสมาชิกรายบุคคล
        </button>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="printReportSection('financial-subtab-content', 'รายงานการเงิน')">${icon('printer')} พิมพ์รายงานการเงิน</button>
    </div>
    <div id="financial-subtab-content"></div>
  `;

  const subContent = $('#financial-subtab-content');
  if (state.financialSubTab === 'overview') {
    renderFinancialOverview(subContent);
  } else {
    renderFinancialStatement(subContent);
  }
}

async function renderFinancialOverview(container){
  container.innerHTML = `<div class="empty">${icon('arrow-repeat')} กำลังโหลดข้อมูลการเงินโครงการ...</div>`;
  const year = state.reportYear;
  const r = await api(`api/reports.php?action=financial_summary&year=${year}`);
  if (!r) {
    container.innerHTML = empty('ไม่สามารถโหลดข้อมูลงบการเงินได้');
    return;
  }

  const l = r.loans;
  const ledger = r.ledger;

  container.innerHTML = `
    <div class="grid grid-4">
      <div class="stat-card">
        <div class="stat-icon">${icon('cash')}</div>
        <div class="stat-label">เงินต้นปล่อยกู้รวม</div>
        <div class="stat-value">${money(l.total_principal)}</div>
        <div class="stat-note">สัญญาอนุมัติ ${l.total_contracts} ฉบับ</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">${icon('graph-up-arrow')}</div>
        <div class="stat-label">ดอกเบี้ย 6% คาดการณ์</div>
        <div class="stat-value text-info">${money(l.total_interest)}</div>
        <div class="stat-note">ยอดเรียกเก็บรวม ${money(l.total_receivable)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">${icon('check2-circle')}</div>
        <div class="stat-label">ยอดรับชำระคืนแล้ว</div>
        <div class="stat-value text-success">${money(l.total_collected)}</div>
        <div class="stat-note">เงินต้น + ดอกเบี้ย</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">${icon('exclamation-octagon')}</div>
        <div class="stat-label">หนี้คงค้างสุทธิ</div>
        <div class="stat-value text-danger">${money(l.total_outstanding)}</div>
        <div class="stat-note">ยอดที่ต้องติดตาม</div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-top:18px">
      <div class="card" style="box-shadow:none;border:1px solid var(--border)">
        <h3 class="card-title">การจำแนกหนี้ตามสถานะความเสี่ยง</h3>
        <div style="margin-top:14px">
          ${(r.debt_by_risk || []).map(d => `
            <div class="receipt-row">
              <span>
                ${d.risk_status === 'normal' ? '<span class="badge badge-success">ปกติ</span>' : `<span class="badge badge-warning">${esc(d.risk_status)}</span>`}
                (${d.member_count} สมาชิก)
              </span>
              <strong>คงเหลือ ${money(Math.max(0, Number(d.payable) - Number(d.paid)))} บาท</strong>
            </div>
          `).join('') || '<div class="text-muted">ยังไม่มีข้อมูลหนี้</div>'}
        </div>
      </div>

      <div class="card" style="box-shadow:none;border:1px solid var(--border)">
        <h3 class="card-title">สรุปบัญชีรายรับ-รายจ่าย (Ledger) ประจำปี ${year}</h3>
        <div style="margin-top:14px">
          <div class="receipt-row">
            <span>รายรับสะสม</span>
            <strong class="text-success">${money(ledger.income)} บาท</strong>
          </div>
          <div class="receipt-row">
            <span>รายจ่ายสะสม</span>
            <strong class="text-danger">${money(ledger.expense)} บาท</strong>
          </div>
          <div class="receipt-row" style="border-top:2px solid var(--border);padding-top:10px">
            <strong>เงินสดคงเหลือสุทธิ</strong>
            <strong class="${ledger.balance >= 0 ? 'text-success' : 'text-danger'}">${money(ledger.balance)} บาท</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function renderFinancialStatement(container){
  const mListRes = await api('api/members.php?action=list');
  const members = (mListRes?.data || []).filter(x => x.role === 'member');
  const selectedId = state.selectedReportMemberId || members[0]?.id;

  container.innerHTML = `
    <div class="toolbar" style="margin-bottom:16px">
      <label class="form-label" style="margin:0">เลือกสมาชิกเพื่อดู Statement:</label>
      <select class="form-select" style="max-width:350px" onchange="state.selectedReportMemberId=Number(this.value);renderFinancialStatement($('#financial-subtab-content'))">
        ${members.map(m => `<option value="${m.id}" ${m.id == selectedId ? 'selected' : ''}>${esc(m.fullname)} (${esc(m.username)})</option>`).join('')}
      </select>
    </div>
    <div id="financial-statement-detail"></div>
  `;

  if (!selectedId) {
    $('#financial-statement-detail').innerHTML = empty('ยังไม่มีข้อมูลสมาชิก');
    return;
  }

  const detailRes = await api(`api/reports.php?action=member_detail&member_id=${selectedId}`);
  if (!detailRes) {
    $('#financial-statement-detail').innerHTML = empty('ไม่สามารถโหลดข้อมูล Statement ได้');
    return;
  }

  const m = detailRes.member;
  const reqs = detailRes.requests || [];

  $('#financial-statement-detail').innerHTML = `
    <div class="card" style="box-shadow:none;border:1px solid var(--border)">
      <div class="card-header">
        <div>
          <h3 class="card-title">Statement บัญชีเงินกู้: ${esc(m.fullname)}</h3>
          <p class="card-subtitle">รหัสสมาชิก: ${esc(m.username)} | บัตรประชาชน: ${esc(m.national_id || '-')}</p>
        </div>
      </div>
      ${reqs.length ? reqs.map(r => `
        <div style="border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:18px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
            <div>
              <strong>สัญญาคำขอ #${r.id} (ปีงบประมาณ ${esc(r.year_be)})</strong>
              <div class="small text-muted">รูปแบบการชำระ: ${r.payment_mode === 'lump_sum' ? 'ชำระก้อนเดียว' : `แบ่ง ${r.installment_count} งวด`} · ดอกเบี้ย 6% ต่อปี</div>
            </div>
            <div>${badge(r.status)}</div>
          </div>
          <div class="grid grid-3" style="margin-bottom:14px">
            <div class="stat-card" style="padding:12px">
              <div class="small text-muted">ยอดเงินต้น</div>
              <strong>${money(r.amount_requested)} บาท</strong>
            </div>
            <div class="stat-card" style="padding:12px">
              <div class="small text-muted">ชำระคืนแล้ว</div>
              <strong class="text-success">${money(r.total_paid)} บาท</strong>
            </div>
            <div class="stat-card" style="padding:12px">
              <div class="small text-muted">คงเหลือสุทธิ</div>
              <strong class="${Number(r.remaining) > 0 ? 'text-danger' : 'text-muted'}">${money(r.remaining)} บาท</strong>
            </div>
          </div>

          ${(r.installments || []).length ? `
            <div class="section-title">ตารางงวดชำระ</div>
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>งวดที่</th>
                    <th>วันครบกำหนด</th>
                    <th>เงินต้น</th>
                    <th>ดอกเบี้ย</th>
                    <th>ยอดเรียกเก็บ</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  ${r.installments.map(i => `
                    <tr>
                      <td>${i.installment_no}</td>
                      <td>${esc(i.due_date)}</td>
                      <td>${money(i.principal_due)}</td>
                      <td>${money(i.interest_due)}</td>
                      <td><strong>${money(i.amount_due)} บาท</strong></td>
                      <td>${i.status === 'paid' ? '<span class="badge badge-success">ชำระแล้ว</span>' : i.status === 'partial' ? '<span class="badge badge-warning">ชำระบางส่วน</span>' : '<span class="badge badge-neutral">รอชำระ</span>'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${(r.payments || []).length ? `
            <div class="section-title" style="margin-top:14px">ประวัติการชำระเงินและหลักฐาน</div>
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>วันที่</th>
                    <th>เลขที่ใบเสร็จ</th>
                    <th>ช่องทาง</th>
                    <th>จำนวนเงิน</th>
                    <th>สถานะ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${r.payments.map(p => `
                    <tr>
                      <td>${esc(p.payment_date)}</td>
                      <td><strong>${esc(p.receipt_number || '-')}</strong></td>
                      <td>${p.payment_channel === 'cash' ? 'เงินสด' : 'โอนเงิน'}</td>
                      <td class="text-success fw-bold">${money(p.amount)} บาท</td>
                      <td><span class="badge badge-success">ยืนยันแล้ว</span></td>
                      <td>
                        <button class="btn btn-secondary btn-sm" onclick="showReceipt(${p.id})">
                          ${icon('printer')} ใบเสร็จ
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div class="text-muted small" style="margin-top:10px">ยังไม่มีรายการรับชำระสำหรับสัญญานี้</div>'}
        </div>
      `).join('') : empty('ยังไม่มีข้อมูลสัญญา')}
    </div>
  `;
}

// -------------------------------------------------------------
// 4. Official Printable Forms (Contracts, Guarantor, Proposal)
// -------------------------------------------------------------
async function renderFormsReport(container){
  container.innerHTML = `<div class="empty">${icon('arrow-repeat')} กำลังเตรียมรายการแบบฟอร์ม...</div>`;
  const reqRes = await api('api/requests.php?action=list');
  const reqs = reqRes?.data || [];

  if (!reqs.length) {
    container.innerHTML = empty('ยังไม่มีคำขอในระบบสำหรับพิมพ์แบบฟอร์ม');
    return;
  }

  container.innerHTML = `
    <div class="toolbar no-print" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <label class="form-label" style="margin:0">เลือกคำขอ/สัญญา:</label>
        <select class="form-select" id="form-sel-request" style="max-width:380px" onchange="previewOfficialForm()">
          ${reqs.map(x => `<option value="${x.id}">คำขอ #${x.id} - ${esc(x.fullname)} (วงเงิน ${money(x.amount_requested)} บาท)</option>`).join('')}
        </select>
        <label class="form-label" style="margin:0 0 0 10px">เลือกแบบฟอร์ม:</label>
        <select class="form-select" id="form-sel-type" style="max-width:280px" onchange="previewOfficialForm()">
          <option value="all_in_one">⭐ พิมพ์ชุดสัญญาครบเซ็ต (กทบ.๐๔+๐๕+๐๓)</option>
          <option value="contract">๑. สัญญากู้ยืมเงิน (แบบ กทบ.๐๔ ๒ หน้า)</option>
          <option value="guarantor">๒. สัญญาค้ำประกัน (แบบ กทบ.๐๕)</option>
          <option value="spouse">๓. คำรับรองยินยอมคู่สมรส (แบบ กทบ.๐๓)</option>
          <option value="proposal">๔. แบบคำขอกู้ยืม (กทบ.๐๑/๐๒)</option>
        </select>
      </div>
      <button class="btn btn-primary" type="button" onclick="printCurrentReportForm()">${icon('printer')} พิมพ์เอกสารนี้ (Print A4)</button>
    </div>

    <div class="print-doc-container">
      <div id="form-preview-mount"></div>
    </div>
  `;

  previewOfficialForm();
}

async function previewOfficialForm(){
  const reqId = Number($('#form-sel-request')?.value || 0);
  const formType = $('#form-sel-type')?.value || 'contract';
  const mount = $('#form-preview-mount');
  if (!reqId || !mount) return;

  mount.innerHTML = `<div class="empty">${icon('arrow-repeat')} กำลังจัดเตรียมเอกสารแบบฟอร์ม...</div>`;
  const r = await api(`api/reports.php?action=form_data&request_id=${reqId}`);
  if (!r || !r.form_data) {
    mount.innerHTML = empty('ไม่สามารถโหลดข้อมูลเอกสารได้');
    return;
  }

  const d = r.form_data;
  mount.innerHTML = generateFormHtml(formType, d);
}

function printCurrentReportForm(){
  const mount = $('#form-preview-mount');
  if (!mount || !mount.firstElementChild) return toast('ไม่พบเอกสารสำหรับพิมพ์', 'error');
  const formType = $('#form-sel-type')?.value || 'contract';
  const title = officialFormTitle(formType);
  printDocumentHtml(mount.innerHTML, title);
}

function printOfficialFormModal(requestId){
  openModal('พิมพ์แบบฟอร์มเอกสาร / สัญญา', `
    <div class="toolbar no-print" style="margin-bottom:14px">
      <label class="form-label" style="margin:0">เลือกแบบฟอร์ม:</label>
      <select class="form-select" id="modal-form-type" style="max-width:320px" onchange="loadModalFormPreview(${requestId})">
        <option value="all_in_one">⭐ พิมพ์ชุดสัญญาครบเซ็ต (กทบ.๐๔+๐๕+๐๓)</option>
        <option value="contract">๑. สัญญากู้ยืมเงิน (แบบ กทบ.๐๔ ๒ หน้า)</option>
        <option value="guarantor">๒. สัญญาค้ำประกัน (แบบ กทบ.๐๕)</option>
        <option value="spouse">๓. คำรับรองยินยอมคู่สมรส (แบบ กทบ.๐๓)</option>
        <option value="proposal">๔. แบบคำขอกู้ยืม (กทบ.๐๑/๐๒)</option>
      </select>
      <button class="btn btn-primary" type="button" onclick="printModalForm()">${icon('printer')} พิมพ์เอกสาร (Print)</button>
    </div>
    <div class="print-doc-container" style="max-height:70vh;overflow-y:auto">
      <div id="modal-form-mount"></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">ปิด</button>`);

  loadModalFormPreview(requestId);
}

function printModalForm(){
  const mount = $('#modal-form-mount');
  if (!mount || !mount.firstElementChild) return toast('ไม่พบเอกสารสำหรับพิมพ์', 'error');
  const formType = $('#modal-form-type')?.value || 'contract';
  const title = officialFormTitle(formType);
  printDocumentHtml(mount.innerHTML, title);
}

async function loadModalFormPreview(requestId){
  const formType = $('#modal-form-type')?.value || 'contract';
  const mount = $('#modal-form-mount');
  if (!mount) return;
  mount.innerHTML = `<div class="empty">${icon('arrow-repeat')} กำลังเตรียมเอกสาร...</div>`;
  const r = await api(`api/reports.php?action=form_data&request_id=${requestId}`);
  if (!r || !r.form_data) {
    mount.innerHTML = empty('ไม่สามารถโหลดข้อมูลได้');
    return;
  }
  mount.innerHTML = generateFormHtml(formType, r.form_data);
}

function officialFormTitle(type){
  return ({all_in_one:'ชุดเอกสารสัญญา กทบ.๐๔-๐๕-๐๓',contract:'สัญญากู้ยืมเงิน แบบ กทบ.๐๔',guarantor:'สัญญาค้ำประกัน แบบ กทบ.๐๕',spouse:'คำรับรองและยินยอมของคู่สมรส แบบ กทบ.๐๓',proposal:'แบบคำขอกู้ยืม กทบ.๐๑/๐๒'})[type] || 'แบบฟอร์มกองทุนหมู่บ้าน';
}
function generateFormHtml(type, d){
  const req=d.request||{}, items=d.items||[], gs=d.guarantors||[], ins=d.installments||[], plan=d.payment_plan, v=d.village_info||{}, officers=d.officers||{};
  const committees=officers.committees||[], president=officers.president||'ประธานกองทุนหมู่บ้าน';
  const fill=(x)=>'<span class="doc-fill">'+esc(x||'................................................')+'</span>';
  const clause=(n,s)=>'<p class="doc-p"><strong>ข้อ '+n+'.</strong> '+s+'</p>';
  const date=getThaiDateParts(req.created_at), dateText=toThaiDigits(date.day)+' เดือน '+date.month+' พ.ศ. '+toThaiDigits(date.year);
  const no=toThaiDigits(req.year_be||'')+'/'+toThaiDigits(String(req.id||'').padStart(4,'0'));
  const header=(code,title)=>'<div class="ktb-form-code">แบบ '+code+'</div>'+getKtbLogoSvg(48)+'<div class="ktb-title">'+title+'</div><table class="ktb-header-table"><tr><td>เลขที่ '+fill(no)+'</td><td style="text-align:right">ทำที่ '+esc(v.name||'กองทุนหมู่บ้าน')+'</td></tr><tr><td colspan="2" style="text-align:right">วันที่ '+fill(dateText)+'</td></tr></table>';
  const sign=(label,person)=>'<td><br><br>ลงชื่อ ................................................<br>('+esc(person||'................................................')+')<br>'+label+'</td>';
  const sig=(rows)=>'<table class="sig-table"><tbody>'+rows.map(r=>'<tr>'+r.map(x=>sign(x[0],x[1])).join('')+'</tr>').join('')+'</tbody></table>';
  const page=(code,title,body)=>'<section class="page-container ktb-page">'+header(code,title)+body+'<div class="marginal-sign">ลงชื่อ ..................................... กำกับทุกหน้า</div></section>';
  const table='<table class="doc-table"><thead><tr><th>ลำดับ</th><th>รายการ</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>รวม (บาท)</th></tr></thead><tbody>'+items.map((x,i)=>'<tr><td style="text-align:center">'+toThaiDigits(i+1)+'</td><td>'+esc(x.item_name_snapshot)+'</td><td>'+esc(x.quantity)+' '+esc(x.unit_snapshot)+'</td><td>'+money(x.unit_price_snapshot)+'</td><td>'+money(x.line_total)+'</td></tr>').join('')+'<tr><td colspan="4" style="text-align:right">รวมเป็นเงิน</td><td>'+money(d.amount_num)+'</td></tr></tbody></table>';
  const borrower=fill(req.fullname)+' เลขประจำตัวประชาชน '+fill(req.national_id)+' อยู่บ้านเลขที่ '+fill(req.address)+' โทรศัพท์ '+fill(req.phone);
  const contract1='<p class="doc-p">สัญญานี้ทำขึ้นระหว่าง '+esc(v.name||'กองทุนหมู่บ้าน')+' โดย '+fill(president)+' ตำแหน่งประธานกองทุน ซึ่งต่อไปเรียกว่า “ผู้ให้กู้” กับ '+borrower+' ซึ่งต่อไปเรียกว่า “ผู้กู้” ทั้งสองฝ่ายตกลงกันดังต่อไปนี้</p>'+
    clause('๑','ผู้กู้กู้เงินเพื่อจัดซื้อปัจจัยการผลิต เป็นจำนวน '+fill(money(d.amount_num)+' บาท')+' ('+fill(d.amount_text)+') ตามรายการแนบท้ายสัญญา')+
    clause('๒','ผู้กู้ชำระดอกเบี้ยร้อยละ '+fill('๖ (หก) ต่อปี')+' รวมเงินต้นและดอกเบี้ย '+fill(money(d.total_payable_num)+' บาท')+' ('+fill(d.total_payable_text)+')')+
    clause('๓','ผู้กู้จะใช้เงินกู้หรือปัจจัยการผลิตตามวัตถุประสงค์ของโครงการ และยินยอมให้คณะกรรมการตรวจสอบได้')+
    clause('๔','กำหนดชำระ '+fill(plan&&plan.payment_mode==='lump_sum'?'ครั้งเดียว':'แบ่งชำระ '+(plan&&plan.installment_count||ins.length||12)+' งวด')+' เริ่มวันที่ '+fill(plan&&plan.first_due_date)+' ตามตารางแนบท้าย')+'<p><strong>รายการปัจจัยการผลิตตามสัญญา</strong></p>'+table;
  const ir=ins.slice(0,12).map(x=>'<tr><td>'+toThaiDigits(x.installment_no)+'</td><td>'+esc(x.due_date)+'</td><td>'+money(x.principal_due)+'</td><td>'+money(x.interest_due)+'</td><td>'+money(x.amount_due)+'</td></tr>').join('');
  const contract2=clause('๕','ผู้กู้จัดให้มีผู้ค้ำประกันตามสัญญาค้ำประกัน แบบ กทบ.๐๕ ซึ่งเป็นส่วนหนึ่งของสัญญานี้')+
    clause('๖','หากผิดนัดชำระ ผู้ให้กู้มีสิทธิทวงถามและดำเนินการตามระเบียบและกฎหมายที่เกี่ยวข้อง')+
    clause('๗','ผู้กู้ยินยอมให้ผู้ให้กู้ติดต่อทวงถามตามที่อยู่ที่แจ้ง และจะแจ้งเมื่อมีการเปลี่ยนแปลง')+
    '<p class="doc-p">สัญญานี้จัดทำสองฉบับ มีข้อความถูกต้องตรงกัน คู่สัญญาได้อ่านและเข้าใจแล้ว จึงลงลายมือชื่อต่อหน้าพยาน</p>'+
    '<p><strong>ตารางกำหนดชำระหนี้</strong></p><table class="doc-table"><thead><tr><th>งวด</th><th>วันครบกำหนด</th><th>เงินต้น</th><th>ดอกเบี้ย</th><th>รวม</th></tr></thead><tbody>'+ir+'</tbody></table>'+
    sig([[['ผู้กู้',req.fullname],['ผู้ให้กู้ / ประธานกองทุน',president]],[['กรรมการผู้ให้กู้',committees[0]],['กรรมการ / พยาน',committees[1]]],[['พยาน',''],['ผู้เขียน/ผู้พิมพ์','']]]);
  const contract=page('กทบ.๐๔','สัญญากู้ยืมเงิน',contract1)+page('กทบ.๐๔','สัญญากู้ยืมเงิน (ต่อ)',contract2);
  const guarantorPeople=[0,1].map(i=>{const g=gs[i]||{};return '<p class="doc-p">ผู้ค้ำประกันคนที่ '+toThaiDigits(i+1)+' '+fill(g.fullname)+' เลขประจำตัวประชาชน '+fill(g.national_id)+' อยู่บ้านเลขที่ '+fill(g.address)+' โทรศัพท์ '+fill(g.phone)+'</p>';}).join('');
  const guarantor=page('กทบ.๐๕','สัญญาค้ำประกันการกู้ยืมเงิน','<p class="doc-p">ทำที่ '+esc(v.name||'กองทุนหมู่บ้าน')+' ผู้ค้ำประกันมีรายนามดังนี้: '+guarantorPeople+' ค้ำประกันให้ '+fill(req.fullname)+' ตามสัญญาเลขที่ '+fill(no)+' วงเงิน '+fill(money(d.amount_num)+' บาท')+' ('+fill(d.amount_text)+')</p>'+clause('๑','ผู้ค้ำประกันยินยอมค้ำประกันการชำระหนี้ตามสัญญากู้ดังกล่าว ภายในขอบเขตและเงื่อนไขตามกฎหมาย')+clause('๒','ผู้ค้ำประกันรับทราบสิทธิและหน้าที่ อ่านเข้าใจข้อความโดยตลอด และลงลายมือชื่อต่อหน้าพยาน')+'<p class="doc-p">สัญญานี้จัดทำสองฉบับ มีข้อความถูกต้องตรงกัน</p>'+sig([[['ผู้ค้ำประกันคนที่ ๑',gs[0]&&gs[0].fullname],['ผู้ค้ำประกันคนที่ ๒',gs[1]&&gs[1].fullname]],[['ผู้ให้กู้ / ประธาน',president],['กรรมการผู้ให้กู้',committees[0]]],[['พยาน',committees[1]],['พยาน','']]]));
  const spouse=page('กทบ.๐๓','คำรับรองและยินยอมของคู่สมรส','<p class="doc-p">ข้าพเจ้า '+fill(req.spouse_name)+' อยู่บ้านเลขที่ '+fill(req.address)+' เป็นคู่สมรสของ '+fill(req.fullname)+' สมาชิกกองทุนหมู่บ้าน '+esc(v.name||'')+'</p><p class="doc-p">ข้าพเจ้ารับรองว่าได้รับทราบและยินยอมให้คู่สมรสกู้ยืมเงินจำนวน '+fill(money(d.amount_num)+' บาท')+' ('+fill(d.amount_text)+') ตามสัญญากู้ยืมเงิน แบบ กทบ.๐๔ และยินยอมให้ใช้เงินหรือปัจจัยการผลิตตามวัตถุประสงค์โครงการ</p><p class="doc-p">ได้อ่านและเข้าใจข้อความแล้ว จึงลงลายมือชื่อไว้ต่อหน้าพยาน</p><p style="text-align:right">วันที่ '+fill(dateText)+'</p>'+sig([[['ผู้ให้คำรับรองและยินยอม',req.spouse_name]],[['พยานและผู้รับรอง','']],[['พยานและผู้รับรอง','']]]));
  const proposal=page('กทบ.๐๑/๐๒','แบบคำขอกู้ยืมเงินและปัจจัยการผลิต','<p class="doc-p">ข้าพเจ้า '+borrower+' มีความประสงค์ขอกู้ยืมเงิน ประจำปี '+toThaiDigits(req.year_be||'')+' วงเงิน '+fill(money(d.amount_num)+' บาท')+' ('+fill(d.amount_text)+') เพื่อ '+fill(req.purpose||'ประกอบอาชีพเกษตรกรรม')+'</p>'+table+'<p class="doc-p">ข้าพเจ้ารับรองว่าข้อมูลเป็นความจริง และยินยอมปฏิบัติตามระเบียบกองทุน</p>'+sig([[['ผู้ยื่นคำขอ',req.fullname],['คู่สมรส (ถ้ามี)',req.spouse_name]],[['กรรมการผู้ตรวจสอบ',committees[0]],['ประธานกองทุน',president]]]));
  if(type==='contract')return '<div class="print-doc">'+contract+'</div>';
  if(type==='guarantor')return '<div class="print-doc">'+guarantor+'</div>';
  if(type==='spouse')return '<div class="print-doc">'+spouse+'</div>';
  if(type==='all_in_one')return '<div class="print-doc">'+contract+guarantor+spouse+'</div>';
  return '<div class="print-doc">'+proposal+'</div>';
}
async function line(c){c.innerHTML=`<div class="card"><div class="card-header"><div><h2 class="card-title">ประกาศแจ้งเตือน LINE</h2><p class="card-subtitle">ประกาศไปยังกลุ่ม LINE ที่กำหนดไว้ในระบบ</p></div></div><form id="line-form"><div class="form-group"><label class="form-label">ข้อความประกาศ</label><textarea class="form-control" id="line-msg" placeholder="เขียนข้อความประกาศถึงกลุ่ม LINE" required></textarea></div><button class="btn btn-primary" type="submit">${icon('send')}ส่งประกาศ</button></form><div class="notice" style="margin-top:15px">ข้อความจะส่งไปยังกลุ่ม LINE ที่ตั้งค่า Group ID ไว้ในระบบ</div></div>`;$('#line-form').addEventListener('submit',async e=>{e.preventDefault();const r=await api('api/line_notify.php?action=send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:$('#line-msg').value})});if(r)toast(r.message)})}
async function risk(c){const r=await api('api/members.php?action=list');const rows=(r?.data||[]).filter(x=>x.risk_status!=='normal');c.innerHTML=`<div class="card"><div class="card-header"><div><h2 class="card-title">จัดการสถานะสมาชิกกรณีพิเศษ</h2><p class="card-subtitle">พักชำระหนี้หรือเสียชีวิต โดยเก็บข้อมูลย้อนหลังไว้</p></div></div>${rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>สมาชิก</th><th>สถานะ</th><th>ดำเนินการ</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.fullname)}</td><td><span class="badge badge-warning">${esc(x.risk_status)}</span></td><td><button class="btn btn-secondary btn-sm" onclick="restoreRisk(${x.id})">${icon('arrow-counterclockwise')}เปลี่ยนเป็นปกติ</button></td></tr>`).join('')}</tbody></table></div>`:empty('ไม่มีสมาชิกในสถานะพิเศษ','shield-check')}</div>`}
async function restoreRisk(id){const r=await api('api/members.php?action=update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,risk_status:'normal'})});if(r)nav('risk')}
async function profile(c){const u=state.user;c.innerHTML=`<div class="card"><div class="card-header"><div><h2 class="card-title">ข้อมูลของฉัน</h2><p class="card-subtitle">ข้อมูลบัญชีผู้ใช้งาน</p></div></div><div class="form-grid"><div><div class="small text-muted">ชื่อผู้ใช้</div><strong>${esc(u.username)}</strong></div><div><div class="small text-muted">ชื่อ-นามสกุล</div><strong>${esc(u.fullname)}</strong></div><div><div class="small text-muted">เบอร์โทรศัพท์</div><strong>${esc(u.phone)}</strong></div><div><div class="small text-muted">สถานภาพสมรส</div><strong>${esc(maritalText(u.marital_status))}</strong> ${u.spouse_name ? `(คู่สมรส: ${esc(u.spouse_name)})` : ''}</div><div><div class="small text-muted">สถานะ</div>${u.risk_status==='normal'?'<span class="badge badge-success">ปกติ</span>':`<span class="badge badge-warning">${esc(u.risk_status)}</span>`}</div></div><div class="divider"></div><button class="btn btn-secondary" onclick="showSelfPassword()">${icon('key')}เปลี่ยนรหัสผ่าน</button></div>`}
function showSelfPassword(){openModal('เปลี่ยนรหัสผ่าน',`<form id="pw-form"><div class="form-group"><label class="form-label">รหัสผ่านใหม่</label><input type="password" id="new-pw" class="form-control" minlength="8" required></div><div class="form-group"><label class="form-label">ยืนยันรหัสผ่าน</label><input type="password" id="new-pw2" class="form-control" minlength="8" required></div><button class="btn btn-primary btn-block">${icon('shield-lock')}บันทึกรหัสผ่าน</button></form>`);$('#pw-form').addEventListener('submit',async e=>{e.preventDefault();if($('#new-pw').value!==$('#new-pw2').value)return toast('รหัสผ่านไม่ตรงกัน','error');const r=await api('api/members.php?action=update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:state.user.id,password:$('#new-pw').value})});if(r){closeModal();toast('เปลี่ยนรหัสผ่านแล้ว')}})}
async function boot(){const r=await api('api/auth.php?action=status');state.stationMember=null;state.stationContext=false;if(r?.logged_in){state.user=r.user;renderShell()}else renderLogin()}
document.addEventListener('DOMContentLoaded',boot);
