<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';

$pdo = db();
echo "== Starting Mock Data Seeding ==\n";

// 1. Ensure Fiscal Year 2569 exists and is open
$stmt = $pdo->prepare("SELECT id FROM fiscal_years WHERE year_be = 2569 LIMIT 1");
$stmt->execute();
$fyId = $stmt->fetchColumn();
if (!$fyId) {
    $pdo->exec("INSERT INTO fiscal_years (year_be, status, request_open, market_survey_done) VALUES (2569, 'open', 1, 1)");
    $fyId = (int)$pdo->lastInsertId();
    echo "Created Fiscal Year 2569 (ID: $fyId)\n";
} else {
    $fyId = (int)$fyId;
    $pdo->exec("UPDATE fiscal_years SET status = 'open', request_open = 1, market_survey_done = 1 WHERE id = $fyId");
    echo "Updated Fiscal Year 2569 (ID: $fyId) to open\n";
}

// 2. Ensure Admin (President) exists
$passHash = password_hash('1111', PASSWORD_DEFAULT);
$adminStmt = $pdo->prepare("SELECT id FROM members WHERE username = 'admin' LIMIT 1");
$adminStmt->execute();
$adminId = $adminStmt->fetchColumn();
if (!$adminId) {
    $pdo->prepare("INSERT INTO members (username, password, fullname, national_id, phone, role, marital_status, spouse_name, address, is_active)
        VALUES ('admin', ?, 'นายสมเกียรติ ยางตาล (ประธานกองทุน)', '1549900000001', '0819998888', 'president', 'married', 'นางวันดี ยางตาล', '100 หมู่ 5 ต.แม่ยางตาล อ.ร้องกวาง จ.แพร่', 1)")
        ->execute([$passHash]);
    $adminId = (int)$pdo->lastInsertId();
} else {
    $adminId = (int)$adminId;
    $pdo->prepare("UPDATE members SET role = 'president', fullname = 'นายสมเกียรติ ยางตาล (ประธานกองทุน)', is_active = 1 WHERE id = ?")
        ->execute([$adminId]);
}
echo "Admin ID: $adminId\n";

// 3. Seed Committee Members (3 members)
$committees = [
    [
        'username' => 'comm01',
        'fullname' => 'นายประสิทธิ์ มงคลสุข',
        'national_id' => '1549900000011',
        'phone' => '0812340001',
        'address' => '12 หมู่ 2 ต.แม่ยางตาล อ.ร้องกวาง จ.แพร่',
        'marital_status' => 'married',
        'spouse_name' => 'นางสมใจ มงคลสุข'
    ],
    [
        'username' => 'comm02',
        'fullname' => 'นางอำไพ แก้วทอง',
        'national_id' => '1549900000012',
        'phone' => '0812340002',
        'address' => '35 หมู่ 3 ต.แม่ยางตาล อ.ร้องกวาง จ.แพร่',
        'marital_status' => 'married',
        'spouse_name' => 'นายบุญเลิศ แก้วทอง'
    ],
    [
        'username' => 'comm03',
        'fullname' => 'นายสุวิทย์ คำมูล',
        'national_id' => '1549900000013',
        'phone' => '0812340003',
        'address' => '48 หมู่ 4 ต.แม่ยางตาล อ.ร้องกวาง จ.แพร่',
        'marital_status' => 'single',
        'spouse_name' => ''
    ]
];

$commIds = [];
$defaultPassHash = password_hash('123456', PASSWORD_DEFAULT);
foreach ($committees as $c) {
    $s = $pdo->prepare("SELECT id FROM members WHERE username = ?");
    $s->execute([$c['username']]);
    $cId = $s->fetchColumn();
    if (!$cId) {
        $ins = $pdo->prepare("INSERT INTO members (username, password, fullname, national_id, phone, role, marital_status, spouse_name, address, is_active)
            VALUES (?, ?, ?, ?, ?, 'committee', ?, ?, ?, 1)");
        $ins->execute([$c['username'], $defaultPassHash, $c['fullname'], $c['national_id'], $c['phone'], $c['marital_status'], $c['spouse_name'], $c['address']]);
        $cId = (int)$pdo->lastInsertId();
    } else {
        $cId = (int)$cId;
        $pdo->prepare("UPDATE members SET role = 'committee', is_active = 1 WHERE id = ?")->execute([$cId]);
    }
    $commIds[] = $cId;
}
echo "Committee accounts ready: " . implode(', ', $commIds) . "\n";

// 4. Seed Catalog Items (12 items)
$catalogList = [
    ['fertilizer', 'ปุ๋ยเคมีสูตร 16-16-16 ตราหัววัวคันไถ', 'กระสอบ 50 กก. ปุ๋ยบำรุงต้น ใบ และผล', 'กระสอบ', 1250.00],
    ['fertilizer', 'ปุ๋ยยูเรียสูตร 46-0-0 ตรากระต่าย', 'กระสอบ 50 กก. บำรุงการเจริญเติบโต ลำต้นและใบเขียวทน', 'กระสอบ', 1150.00],
    ['fertilizer', 'ปุ๋ยเคมีสูตร 15-15-15 ตรามงกุฎ', 'กระสอบ 50 กก. บำรุงพืชผัก พืชไร่ และผลไม้ทั่วไป', 'กระสอบ', 1200.00],
    ['fertilizer', 'ปุ๋ยอินทรีย์อัดเม็ด ตราพืชทองธรรมชาติ', 'กระสอบ 50 กก. ปรับปรุงโครงสร้างดิน เพิ่มจุลินทรีย์', 'กระสอบ', 450.00],
    ['fertilizer', 'ปูนโดโลไมท์ปรับสภาพกรดด่างของดิน', 'กระสอบ 50 กก. แก้ดินเปรี้ยว ดินเค็ม เพิ่มแคลเซียม', 'กระสอบ', 120.00],
    ['medicine', 'สารกำจัดวัชพืช กลูโฟซิเนต-แอมโมเนียม 15% W/V', 'แกลลอน 4 ลิตร ฆ่าหญ้าใบแคบและใบกว้าง ปลอดภัยต่อรากพืช', 'แกลลอน', 850.00],
    ['medicine', 'สารป้องกันกำจัดเชื้อราและโรคพืช แมนโคเซบ', 'ถุง 1 กก. ป้องกันโรคราน้ำค้าง ใบจุด ราสนิม', 'กิโลกรัม', 280.00],
    ['medicine', 'สารกำจัดหนอนและเพลี้ย อะบาเมกติน 1.8% W/V', 'ขวด 1 ลิตร ออกฤทธิ์ดูดซึมและสัมผัสตาย', 'ขวด', 380.00],
    ['seed', 'เมล็ดพันธุ์ข้าวขาวดอกมะลิ 105 (พันธุ์คัดบริสุทธิ์)', 'กระสอบ 25 กก. อัตราการงอกสูง เมล็ดพันธุ์แท้กรมการข้าว', 'กระสอบ', 850.00],
    ['seed', 'เมล็ดพันธุ์ข้าวเหนียว กข6 (พันธุ์รับรอง)', 'กระสอบ 25 กก. หอม นุ่ม ต้านทานโรคไหม้', 'กระสอบ', 800.00],
    ['seed', 'เมล็ดพันธุ์ข้าวโพดเลี้ยงสัตว์ ซีพี 888', 'ถุง 10 กก. ผลผลิตสูง ทนแล้ง หักง่าย เมล็ดเต็มฝัก', 'ถุง', 1650.00],
    ['other', 'ชุดสายยางน้ำหยด PE พร้อมหัวน้ำหยดครบชุด (200 เมตร)', 'ม้วน 200 เมตร ประหยัดน้ำ ติดตั้งง่าย สำหรับสวนผลไม้และพืชผัก', 'ม้วน', 950.00]
];

$catalogIds = [];
foreach ($catalogList as $idx => $it) {
    $s = $pdo->prepare("SELECT id FROM catalog_items WHERE fiscal_year_id = ? AND name = ? LIMIT 1");
    $s->execute([$fyId, $it[1]]);
    $catId = $s->fetchColumn();
    if (!$catId) {
        $ins = $pdo->prepare("INSERT INTO catalog_items (fiscal_year_id, category, name, description, unit, unit_price, is_active, created_by)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)");
        $ins->execute([$fyId, $it[0], $it[1], $it[2], $it[3], $it[4], $adminId]);
        $catId = (int)$pdo->lastInsertId();
    } else {
        $catId = (int)$catId;
    }
    $catalogIds[] = ['id' => $catId, 'name' => $it[1], 'unit' => $it[3], 'price' => $it[4]];
}
echo "Catalog items ready: " . count($catalogIds) . " items\n";

// 5. Seed 50 realistic Thai members
$firstnames = [
    'สมชาย', 'สมศักดิ์', 'ประสิทธิ์', 'บุญช่วย', 'บุญส่ง', 'ทองคำ', 'สุริยา', 'อำนวย', 'ประเสริฐ', 'ประยงค์',
    'วิทยา', 'ไพโรจน์', 'วิชัย', 'สุวรรณ', 'นิกร', 'สุเทพ', 'อดุลย์', 'สงวน', 'สมาน', 'ถาวร',
    'สมรักษ์', 'สมพร', 'มาลี', 'สมคิด', 'ประภา', 'วันดี', 'พวงเพ็ญ', 'นงนุช', 'จันเพ็ญ', 'อุบล',
    'สายฝน', 'วิมล', 'รัตนา', 'บังอร', 'พยอม', 'บัวลอย', 'ยุพา', 'ศิริพร', 'ลำดวน', 'ทองใบ',
    'ณรงค์', 'ทวี', 'ธีระ', 'บัญชา', 'ปรีชา', 'มงคล', 'วัฒนา', 'ศักดิ์ดา', 'อนันต์', 'อุดม'
];

$lastnames = [
    'ยางตาล', 'อินถา', 'แก้วทอง', 'คำมูล', 'มงคลสุข', 'พงษ์เพชร', 'ใจดี', 'ทองดี', 'พรมมา', 'สุขสมบัติ',
    'ศรีวิชัย', 'วงศ์ใหญ่', 'จันทรา', 'บุญทา', 'ต๊ะคำ', 'วังกา', 'เขื่อนแก้ว', 'หน่อแก้ว', 'คำแปง', 'ปัญญา',
    'มานพ', 'พรมมี', 'ปันต๊ะ', 'วงค์ษา', 'ยอดใจ', 'เมืองใจ', 'ฟูเจริญ', 'ใจคำ', 'ไชยวงศ์', 'เมืองแก้ว',
    'ศรีคำ', 'ทิพย์ปัญญา', 'สุริยวงศ์', 'ปินใจ', 'คำหล้า', 'อินทร์แก้ว', 'ธิปัญญา', 'คำปัน', 'แสงแก้ว', 'ทองหล่อ',
    'ธรรมมา', 'สุธรรม', 'อินตา', 'ดวงตา', 'เป็งปัน', 'หล้าคำ', 'สุขใจ', 'มณีแก้ว', 'อินปัน', 'แสงคำ'
];

$members = [];
for ($i = 1; $i <= 50; $i++) {
    $code = sprintf('M%03d', $i);
    $fn = $firstnames[$i - 1];
    $ln = $lastnames[$i - 1];
    $fullname = ($i % 2 === 0 ? 'นาง' : 'นาย') . $fn . ' ' . $ln;
    $nid = sprintf('1549900%06d', $i + 100);
    $phone = sprintf('08%02d%06d', ($i % 9) + 1, rand(100000, 999999));
    $moo = ($i % 8) + 1;
    $address = sprintf('%d หมู่ %d ต.แม่ยางตาล อ.ร้องกวาง จ.แพร่', rand(1, 150), $moo);
    $marital = $i % 4 === 0 ? 'single' : ($i % 10 === 0 ? 'widowed' : 'married');
    $spouse = $marital === 'married' ? ($i % 2 === 0 ? 'นาย' : 'นาง') . $firstnames[(50 - $i)] . ' ' . $ln : '';
    $risk = $i === 35 ? 'suspended' : ($i === 48 ? 'deceased' : 'normal');

    $s = $pdo->prepare("SELECT id FROM members WHERE username = ?");
    $s->execute([$code]);
    $mId = $s->fetchColumn();
    if (!$mId) {
        $ins = $pdo->prepare("INSERT INTO members (username, password, fullname, national_id, phone, role, marital_status, spouse_name, address, risk_status, is_active)
            VALUES (?, ?, ?, ?, ?, 'member', ?, ?, ?, ?, 1)");
        $ins->execute([$code, $defaultPassHash, $fullname, $nid, $phone, $marital, $spouse, $address, $risk]);
        $mId = (int)$pdo->lastInsertId();
    } else {
        $mId = (int)$mId;
        $pdo->prepare("UPDATE members SET fullname=?, national_id=?, phone=?, marital_status=?, spouse_name=?, address=?, risk_status=?, is_active=1 WHERE id=?")
            ->execute([$fullname, $nid, $phone, $marital, $spouse, $address, $risk, $mId]);
    }

    $members[] = [
        'id' => $mId,
        'username' => $code,
        'fullname' => $fullname,
        'national_id' => $nid,
        'phone' => $phone,
        'address' => $address,
        'marital' => $marital,
        'spouse' => $spouse,
        'risk' => $risk
    ];
}
echo "50 Members ready.\n";

// 6. Seed Requests across all lifecycle stages
// Stages distribution for 50 members:
// - M001 to M006: completed (6) - ชำระครบถ้วน 100%
// - M007 to M022: active (16) - อยู่ระหว่างผ่อนชำระ มีการจ่ายเงินบางงวด
// - M023 to M028: contract_pending (6) - ประธานอนุมัติแล้ว รอยืนยันสัญญา
// - M029 to M033: president_review (5) - กรรมการตรวจแล้ว รอประธานพิจารณา
// - M034 to M038: submitted (5) - ยื่นคำขอใหม่ รอคณะกรรมการตรวจ
// - M039 to M041: committee_rejected (3) - คณะกรรมการปฏิเสธ
// - M042 to M043: president_rejected (2) - ประธานปฏิเสธ
// - M044 to M045: revision_requested (2) - ขอให้แก้ไขคำขอ
// - M046 to M047: draft (2) - แบบร่าง
// - M048 to M050: no requests (3) - ยังไม่ได้ยื่นคำขอในปีนี้

// Clean up existing requests for FY 2569 to ensure clean state
$pdo->prepare("DELETE FROM payments WHERE request_id IN (SELECT id FROM requests WHERE fiscal_year_id = ?)")->execute([$fyId]);
$pdo->prepare("DELETE FROM request_items WHERE request_id IN (SELECT id FROM requests WHERE fiscal_year_id = ?)")->execute([$fyId]);
$pdo->prepare("DELETE FROM request_guarantors WHERE request_id IN (SELECT id FROM requests WHERE fiscal_year_id = ?)")->execute([$fyId]);
$pdo->prepare("DELETE FROM installment_plans WHERE request_id IN (SELECT id FROM requests WHERE fiscal_year_id = ?)")->execute([$fyId]);
$pdo->prepare("DELETE FROM requests WHERE fiscal_year_id = ?")->execute([$fyId]);
echo "Cleared existing requests for FY 2569 to rebuild consistent workflow data.\n";

$createdReqCount = 0;
$paymentCount = 0;

for ($i = 0; $i < 47; $i++) {
    $m = $members[$i];
    $idx = $i + 1;

    // Pick 2-4 catalog items for this request
    $itemCount = rand(2, 4);
    $selectedCats = [];
    $totalAmount = 0.0;
    for ($k = 0; $k < $itemCount; $k++) {
        $cat = $catalogIds[($i + $k * 3) % count($catalogIds)];
        $qty = rand(2, 8);
        $lineTotal = round($qty * $cat['price'], 2);
        $selectedCats[] = [
            'id' => $cat['id'],
            'name' => $cat['name'],
            'unit' => $cat['unit'],
            'price' => $cat['price'],
            'qty' => $qty,
            'total' => $lineTotal
        ];
        $totalAmount += $lineTotal;
    }

    // Determine status & timestamps
    $status = 'submitted';
    $commStatus = 'pending';
    $commNote = null;
    $commBy = null;
    $commAt = null;
    $presStatus = 'pending';
    $presNote = null;
    $presBy = null;
    $presAt = null;
    $contractAt = null;
    $contractBy = null;
    $revNote = null;

    if ($idx <= 6) {
        $status = 'completed';
    } elseif ($idx <= 22) {
        $status = 'active';
    } elseif ($idx <= 28) {
        $status = 'contract_pending';
    } elseif ($idx <= 33) {
        $status = 'president_review';
    } elseif ($idx <= 38) {
        $status = 'submitted';
    } elseif ($idx <= 41) {
        $status = 'committee_rejected';
    } elseif ($idx <= 43) {
        $status = 'president_rejected';
    } elseif ($idx <= 45) {
        $status = 'revision_requested';
    } elseif ($idx <= 47) {
        $status = 'draft';
    }

    // Set approval workflow data
    if (in_array($status, ['president_review', 'contract_pending', 'member_confirmed', 'active', 'completed', 'president_rejected'])) {
        $commStatus = 'approved';
        $commNote = 'ผ่านการตรวจสอบคุณสมบัติ เอกสารครบถ้วน และวัตถุประสงค์สอดคล้องกับระเบียบกองทุน';
        $commBy = $commIds[rand(0, 2)];
        $commAt = '2026-06-15 10:30:00';
    }
    if ($status === 'committee_rejected') {
        $commStatus = 'rejected';
        $commNote = 'วงเงินขอกู้เกินความจำเป็น และประวัติการเพาะปลูกไม่ตรงตามเกณฑ์ที่กองทุนกำหนด';
        $commBy = $commIds[0];
        $commAt = '2026-06-16 14:00:00';
    }
    if ($status === 'revision_requested') {
        $commStatus = 'pending';
        $revNote = 'ขอให้แนบสำเนาทะเบียนบ้านของคู่สมรสและระบุวัตถุประสงค์การใช้ปุ๋ยให้ชัดเจน';
        $commBy = $commIds[1];
        $commAt = '2026-06-17 11:15:00';
    }

    if (in_array($status, ['contract_pending', 'member_confirmed', 'active', 'completed'])) {
        $presStatus = 'approved';
        $presNote = 'อนุมัติวงเงินกู้ยืมตามมติคณะกรรมการ เพื่อสนับสนุนการผลิตพืชผลทางการเกษตร';
        $presBy = $adminId;
        $presAt = '2026-06-20 09:45:00';
    }
    if ($status === 'president_rejected') {
        $presStatus = 'rejected';
        $presNote = 'งบประมาณตามกรอบปีนี้เต็ม และผู้กู้ยังติดภาระค้ำประกันซ้ำซ้อน';
        $presBy = $adminId;
        $presAt = '2026-06-21 16:30:00';
    }

    if (in_array($status, ['active', 'completed'])) {
        $contractAt = '2026-06-25 13:00:00';
        $contractBy = $adminId;
    }

    $purpose = 'เพื่อจัดซื้อปัจจัยการผลิต (ปุ๋ยเคมี สารบำรุง และเมล็ดพันธุ์) สำหรับเพาะปลูกฤดูกาลผลิต 2569 ในพื้นที่ ' . rand(5, 25) . ' ไร่';

    $insReq = $pdo->prepare("INSERT INTO requests (member_id, fiscal_year_id, amount_requested, interest_rate, purpose, status,
        committee_status, committee_note, committee_by, committee_at,
        president_status, president_note, president_by, president_at,
        contract_confirmed_at, contract_confirmed_by, revision_note)
        VALUES (?, ?, ?, 6.00, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $insReq->execute([
        $m['id'], $fyId, $totalAmount, $purpose, $status,
        $commStatus, $commNote, $commBy, $commAt,
        $presStatus, $presNote, $presBy, $presAt,
        $contractAt, $contractBy, $revNote
    ]);
    $reqId = (int)$pdo->lastInsertId();
    $createdReqCount++;

    // Insert request items
    $insItem = $pdo->prepare("INSERT INTO request_items (request_id, catalog_item_id, item_name_snapshot, unit_snapshot, unit_price_snapshot, quantity, line_total)
        VALUES (?, ?, ?, ?, ?, ?, ?)");
    foreach ($selectedCats as $sc) {
        $insItem->execute([$reqId, $sc['id'], $sc['name'], $sc['unit'], $sc['price'], $sc['qty'], $sc['total']]);
    }

    // Insert 3 Guarantors (pick next 3 members in ring)
    $insGuar = $pdo->prepare("INSERT INTO request_guarantors (request_id, guarantor_no, fullname, national_id, phone, address)
        VALUES (?, ?, ?, ?, ?, ?)");
    for ($g = 1; $g <= 3; $g++) {
        $gMember = $members[($i + $g) % 50];
        $insGuar->execute([$reqId, $g, $gMember['fullname'], $gMember['national_id'], $gMember['phone'], $gMember['address']]);
    }

    // If active or completed, generate payments & installment plan
    if (in_array($status, ['active', 'completed'])) {
        $interest = round($totalAmount * 0.06, 2);
        $totalPayable = $totalAmount + $interest;

        // Installment plan: 4 installments
        $insPlan = $pdo->prepare("INSERT INTO installment_plans (request_id, payment_mode, installment_count, principal_amount, interest_rate, interest_amount, risk_deduction, total_payable, first_due_date)
            VALUES (?, 'installment', 4, ?, 6.00, ?, 0.00, ?, '2026-08-30')");
        $insPlan->execute([$reqId, $totalAmount, $interest, $totalPayable]);
        $planId = (int)$pdo->lastInsertId();

        $installmentAmt = round($totalPayable / 4, 2);

        if ($status === 'completed') {
            // 4 payments completed
            $payDates = ['2026-08-25', '2026-09-25', '2026-10-25', '2026-11-10'];
            foreach ($payDates as $pNo => $pDate) {
                $rcNo = sprintf('RC-2569-%04d', rand(100, 9999));
                $channel = ($pNo % 2 === 0) ? 'cash' : 'transfer';
                $slip = ($channel === 'transfer') ? 'slip_mock_' . rand(1000, 9999) . '.jpg' : null;
                $pdo->prepare("INSERT INTO payments (request_id, amount, payment_type, payment_channel, payment_date, slip_file, receipt_number, status, note, recorded_by, verified_by, verified_at)
                    VALUES (?, ?, 'installment', ?, ?, ?, ?, 'verified', 'ชำระค่างวดที่ " . ($pNo + 1) . "', ?, ?, ?)")
                    ->execute([$reqId, $installmentAmt, $channel, $pDate, $slip, $rcNo, $commIds[0], $adminId, $pDate . ' 14:00:00']);
                $paymentCount++;
            }
        } elseif ($status === 'active') {
            // 1 to 3 payments completed
            $paidCount = rand(1, 3);
            $payDates = ['2026-08-28', '2026-09-28', '2026-10-28'];
            for ($pNo = 0; $pNo < $paidCount; $pNo++) {
                $rcNo = sprintf('RC-2569-%04d', rand(100, 9999));
                $channel = ($pNo % 2 === 0) ? 'transfer' : 'cash';
                $slip = ($channel === 'transfer') ? 'slip_mock_' . rand(1000, 9999) . '.jpg' : null;
                $pdo->prepare("INSERT INTO payments (request_id, amount, payment_type, payment_channel, payment_date, slip_file, receipt_number, status, note, recorded_by, verified_by, verified_at)
                    VALUES (?, ?, 'installment', ?, ?, ?, ?, 'verified', 'ชำระค่างวดที่ " . ($pNo + 1) . "', ?, ?, ?)")
                    ->execute([$reqId, $installmentAmt, $channel, $payDates[$pNo], $slip, $rcNo, $commIds[1], $adminId, $payDates[$pNo] . ' 11:20:00']);
                $paymentCount++;
            }

            // Maybe 1 pending payment awaiting verification
            if ($i % 3 === 0) {
                $pdo->prepare("INSERT INTO payments (request_id, amount, payment_type, payment_channel, payment_date, slip_file, status, note, recorded_by)
                    VALUES (?, ?, 'installment', 'transfer', '2026-11-12', 'slip_pending.jpg', 'pending', 'สมาชิกรอเจ้าหน้าที่ตรวจสอบสลิปโอนเงิน', ?)")
                    ->execute([$reqId, $installmentAmt, $m['id']]);
                $paymentCount++;
            }
        }
    }
}
echo "Created $createdReqCount requests and $paymentCount payments.\n";

// 7. Seed Accounting Ledger for 2569
$pdo->prepare("DELETE FROM ledger WHERE transaction_date >= '2026-01-01'")->execute();
$ledgerEntries = [
    ['income', '2026-01-15', 1000000.00, 'เงินจัดสรรโครงการประจำปีงบประมาณ 2569 จากรัฐบาล', 'DOC-GOV-2569-01', $adminId],
    ['income', '2026-02-01', 15000.00, 'ค่าธรรมเนียมแรกเข้าสมาชิกใหม่ (50 ราย x 300 บาท)', 'MEM-FEE-2569', $commIds[0]],
    ['expense', '2026-03-10', 4500.00, 'ค่าจัดพิมพ์แบบฟอร์มเอกสาร สัญญา และเอกสารเผยแพร่โครงการ', 'EXP-2569-001', $commIds[1]],
    ['expense', '2026-04-05', 8000.00, 'ค่าเบี้ยประชุมคณะกรรมการจัดเตรียมโครงการและการสำรวจความต้องการสมาชิก', 'EXP-2569-002', $adminId],
    ['income', '2026-05-20', 25000.00, 'เงินปันผลและดอกเบี้ยรับจากเงินฝากบัญชีกองทุนหมู่บ้าน', 'INT-BANK-2569', $commIds[0]],
    ['expense', '2026-06-30', 350000.00, 'จัดซื้อปัจจัยการผลิตงวดที่ 1 ให้แก่สมาชิกที่ได้รับอนุมัติสัญญา', 'PROC-2569-001', $commIds[2]],
    ['expense', '2026-07-20', 280000.00, 'จัดซื้อปัจจัยการผลิตงวดที่ 2 ให้แก่สมาชิกที่ได้รับอนุมัติสัญญา', 'PROC-2569-002', $commIds[2]],
    ['expense', '2026-08-15', 3500.00, 'ค่าวัสดุและอุปกรณ์สำนักงานสำหรับการตรวจรับและส่งมอบสินค้า', 'EXP-2569-003', $commIds[0]],
    ['expense', '2026-09-30', 6000.00, 'ค่าเบี้ยประชุมคณะกรรมการติดตามหนี้และสรุปผลรอบ 6 เดือน', 'EXP-2569-004', $adminId]
];

$insLedger = $pdo->prepare("INSERT INTO ledger (type, transaction_date, amount, description, reference, created_by)
    VALUES (?, ?, ?, ?, ?, ?)");
foreach ($ledgerEntries as $le) {
    $insLedger->execute([$le[0], $le[1], $le[2], $le[3], $le[4], $le[5]]);
}
echo "Ledger entries seeded: " . count($ledgerEntries) . " transactions.\n";

// 8. Seed Procurement Batch & Deliveries
$pdo->prepare("DELETE FROM product_delivery_items WHERE delivery_id IN (SELECT id FROM product_deliveries WHERE batch_id IN (SELECT id FROM procurement_batches WHERE fiscal_year_id = ?))")->execute([$fyId]);
$pdo->prepare("DELETE FROM product_deliveries WHERE batch_id IN (SELECT id FROM procurement_batches WHERE fiscal_year_id = ?)")->execute([$fyId]);
$pdo->prepare("DELETE FROM procurement_batch_items WHERE batch_id IN (SELECT id FROM procurement_batches WHERE fiscal_year_id = ?)")->execute([$fyId]);
$pdo->prepare("DELETE FROM procurement_batches WHERE fiscal_year_id = ?")->execute([$fyId]);

$insBatch = $pdo->prepare("INSERT INTO procurement_batches (fiscal_year_id, batch_no, title, status, purchase_date, expected_date, received_date, announcement_text, created_by)
    VALUES (?, 'BATCH-2569-01', 'รอบจัดซื้อปุ๋ยและเมล็ดพันธุ์ข้าวฤดูกาลผลิต 2569', 'received_complete', '2026-07-01', '2026-07-10', '2026-07-12', 'ขอให้สมาชิกที่มีรายชื่ออนุมัติมารับสินค้า ณ ที่ทำการกองทุนหมู่บ้าน หมู่ 5 ในวันที่ 15 ก.ค. 2569 เป็นต้นไป', ?)");
$insBatch->execute([$fyId, $adminId]);
$batchId = (int)$pdo->lastInsertId();

// Link deliveries for first 15 active/completed requests
$activeReqs = $pdo->query("SELECT id, member_id FROM requests WHERE fiscal_year_id = $fyId AND status IN ('active','completed') LIMIT 15")->fetchAll();
foreach ($activeReqs as $ar) {
    $mRow = $pdo->query("SELECT fullname, national_id FROM members WHERE id = " . (int)$ar['member_id'])->fetch();
    $pdo->prepare("INSERT INTO product_deliveries (batch_id, request_id, member_id, delivery_status, delivery_date, received_by_name, received_by_national_id, received_as, receipt_number, delivered_by, note)
        VALUES (?, ?, ?, 'delivered', '2026-07-15 11:00:00', ?, ?, 'member', ?, ?, 'ส่งมอบสินค้าครบถ้วน ตรวจรับเรียบร้อยแล้ว')")
        ->execute([$batchId, $ar['id'], $ar['member_id'], $mRow['fullname'], $mRow['national_id'], 'DELIV-2569-' . $ar['id'], $commIds[2]]);
}
echo "Procurement batch & deliveries seeded.\n";

echo "== Seeding Completed Successfully! ==\n";
