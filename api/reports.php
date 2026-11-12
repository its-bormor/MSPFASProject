<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';

function baht_text(float $amount): string {
    $amount = round($amount, 2);
    if ($amount == 0.0) return 'ศูนย์บาทถ้วน';
    $words = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    $places = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    $parts = explode('.', sprintf('%.2f', $amount));
    $baht = $parts[0];
    $satang = $parts[1] ?? '00';

    $convertPart = function(string $numStr) use ($words, $places): string {
        $len = strlen($numStr);
        $res = '';
        for ($i = 0; $i < $len; $i++) {
            $digit = (int)$numStr[$i];
            $place = $len - $i - 1;
            if ($digit !== 0) {
                if ($place === 1 && $digit === 1) {
                    $res .= 'สิบ';
                } elseif ($place === 1 && $digit === 2) {
                    $res .= 'ยี่สิบ';
                } elseif ($place === 0 && $digit === 1 && $len > 1 && $numStr[$len - 2] !== '0') {
                    $res .= 'เอ็ด';
                } else {
                    $res .= $words[$digit] . $places[$place % 6];
                }
            }
            if ($place > 0 && $place % 6 === 0) {
                $res .= 'ล้าน';
            }
        }
        return $res;
    };

    $out = '';
    if ((int)$baht > 0) {
        $out .= $convertPart($baht) . 'บาท';
    }
    if ((int)$satang > 0) {
        $out .= $convertPart($satang) . 'สตางค์';
    } else {
        $out .= 'ถ้วน';
    }
    return $out;
}

$user = require_login();
$action = $_GET['action'] ?? 'annual';

try {
    $pdo = db();

    // 1. Annual overview summary
    if ($action === 'annual') {
        require_role(['committee', 'president']);
        $year = (int)($_GET['year'] ?? (date('Y') + 543));
        $s = $pdo->prepare('SELECT id, year_be, status, request_open FROM fiscal_years WHERE year_be = ?');
        $s->execute([$year]);
        $fy = $s->fetch();
        if (!$fy) json_response(['status' => 'error', 'message' => 'ไม่พบปีงบประมาณ'], 404);
        $id = (int)$fy['id'];

        $q = $pdo->prepare("SELECT COUNT(*) total,
            SUM(status IN ('member_confirmed','active','completed','contract_pending')) approved,
            SUM(status IN ('committee_rejected','president_rejected')) rejected,
            SUM(status = 'submitted') pending,
            COALESCE(SUM(amount_requested), 0) requested_amount
            FROM requests WHERE fiscal_year_id = ?");
        $q->execute([$id]);
        $summary = $q->fetch();

        $q = $pdo->prepare("SELECT COALESCE(SUM(p.amount), 0) paid
            FROM payments p
            JOIN requests r ON r.id = p.request_id
            WHERE r.fiscal_year_id = ? AND p.status = 'verified'");
        $q->execute([$id]);
        $paid = (float)$q->fetchColumn();

        $q = $pdo->prepare("SELECT COALESCE(SUM(ip.total_payable), 0) payable,
            COALESCE(SUM(ip.principal_amount), 0) principal,
            COALESCE(SUM(ip.interest_amount), 0) interest
            FROM installment_plans ip
            JOIN requests r ON r.id = ip.request_id
            WHERE r.fiscal_year_id = ?");
        $q->execute([$id]);
        $planData = $q->fetch();
        $payable = (float)($planData['payable'] ?? 0);
        $principal = (float)($planData['principal'] ?? 0);
        $interest = (float)($planData['interest'] ?? 0);

        $q = $pdo->prepare("SELECT c.category, COUNT(ri.id) AS line_count,
            COALESCE(SUM(ri.quantity), 0) quantity,
            COALESCE(SUM(ri.line_total), 0) amount
            FROM request_items ri
            JOIN requests r ON r.id = ri.request_id
            JOIN catalog_items c ON c.id = ri.catalog_item_id
            WHERE r.fiscal_year_id = ?
            GROUP BY c.category");
        $q->execute([$id]);
        $byCategory = $q->fetchAll();

        // Ledger totals for calendar year corresponding to fiscal year
        $gregYear = $year - 543;
        $q = $pdo->prepare("SELECT type, COALESCE(SUM(amount), 0) amount FROM ledger WHERE YEAR(transaction_date) = ? GROUP BY type");
        $q->execute([$gregYear]);
        $ledger = $q->fetchAll();

        // Count members
        $memberCount = (int)$pdo->query("SELECT COUNT(*) FROM members WHERE role = 'member' AND is_active = 1")->fetchColumn();
        $borrowerCount = (int)$pdo->query("SELECT COUNT(DISTINCT member_id) FROM requests WHERE fiscal_year_id = {$id}")->fetchColumn();

        // Repayment rate
        $repaymentRate = $payable > 0 ? round(($paid / $payable) * 100, 2) : 0;

        json_response([
            'status' => 'success',
            'year' => $year,
            'fiscal_year' => $fy,
            'summary' => $summary,
            'principal' => $principal,
            'interest' => $interest,
            'paid' => $paid,
            'payable' => $payable,
            'remaining' => max(0, $payable - $paid),
            'member_count' => $memberCount,
            'borrower_count' => $borrowerCount,
            'repayment_rate' => $repaymentRate,
            'by_category' => $byCategory,
            'ledger' => $ledger
        ]);
    }

    // 2. Member Annual Summary Roster
    if ($action === 'member_annual_list') {
        require_role(['committee', 'president']);
        $year = (int)($_GET['year'] ?? (date('Y') + 543));
        $s = $pdo->prepare('SELECT id FROM fiscal_years WHERE year_be = ?');
        $s->execute([$year]);
        $fy = $s->fetch();
        $fyId = $fy ? (int)$fy['id'] : 0;

        $sql = "SELECT m.id, m.username, m.fullname, m.national_id, m.phone, m.risk_status, m.is_active,
            r.id AS request_id, r.amount_requested, r.status AS request_status,
            COALESCE(ip.total_payable, 0) AS total_payable,
            COALESCE(pay.paid_amount, 0) AS total_paid
            FROM members m
            LEFT JOIN requests r ON r.member_id = m.id AND r.fiscal_year_id = ?
            LEFT JOIN installment_plans ip ON ip.request_id = r.id
            LEFT JOIN (
                SELECT request_id, SUM(amount) AS paid_amount
                FROM payments
                WHERE status = 'verified'
                GROUP BY request_id
            ) pay ON pay.request_id = r.id
            WHERE m.role = 'member'
            ORDER BY m.fullname ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$fyId]);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $payable = (float)$r['total_payable'];
            $paid = (float)$r['total_paid'];
            $r['remaining_debt'] = max(0, $payable - $paid);
        }
        unset($r);

        json_response(['status' => 'success', 'year' => $year, 'data' => $rows]);
    }

    // 3. Member Detail Report (Individual)
    if ($action === 'member_detail') {
        $memberId = (int)($_GET['member_id'] ?? 0);
        if ($user['role'] === 'member') {
            $memberId = (int)$user['id'];
        }
        if (!$memberId) json_response(['status' => 'error', 'message' => 'กรุณาเลือกสมาชิก'], 422);

        $mStmt = $pdo->prepare('SELECT id, username, fullname, national_id, phone, role, marital_status, spouse_name, address, risk_status, is_active, created_at FROM members WHERE id = ?');
        $mStmt->execute([$memberId]);
        $member = $mStmt->fetch();
        if (!$member) json_response(['status' => 'error', 'message' => 'ไม่พบข้อมูลสมาชิก'], 404);

        // Requests of member
        $rStmt = $pdo->prepare("SELECT r.id, r.fiscal_year_id, r.amount_requested, r.interest_rate, r.purpose, r.status, r.created_at, fy.year_be,
            COALESCE(ip.total_payable, 0) AS total_payable,
            COALESCE(ip.payment_mode, 'installment') AS payment_mode,
            COALESCE(ip.installment_count, 1) AS installment_count
            FROM requests r
            LEFT JOIN fiscal_years fy ON fy.id = r.fiscal_year_id
            LEFT JOIN installment_plans ip ON ip.request_id = r.id
            WHERE r.member_id = ?
            ORDER BY r.created_at DESC");
        $rStmt->execute([$memberId]);
        $requests = $rStmt->fetchAll();

        $totalRequested = 0.0;
        $totalPayable = 0.0;
        $totalPaid = 0.0;

        foreach ($requests as &$req) {
            $totalRequested += (float)$req['amount_requested'];
            $totalPayable += (float)$req['total_payable'];

            // Get items
            $iStmt = $pdo->prepare('SELECT item_name_snapshot, unit_snapshot, unit_price_snapshot, quantity, line_total FROM request_items WHERE request_id = ?');
            $iStmt->execute([$req['id']]);
            $req['items'] = $iStmt->fetchAll();

            // Get payments
            $pStmt = $pdo->prepare("SELECT id, amount, payment_channel, payment_date, receipt_number, status FROM payments WHERE request_id = ? AND status = 'verified' ORDER BY payment_date ASC");
            $pStmt->execute([$req['id']]);
            $req['payments'] = $pStmt->fetchAll();
            $paidForReq = array_sum(array_column($req['payments'], 'amount'));
            $req['total_paid'] = $paidForReq;
            $req['remaining'] = max(0, (float)$req['total_payable'] - $paidForReq);
            $totalPaid += $paidForReq;

            // Get guarantors
            $gStmt = $pdo->prepare('SELECT guarantor_no, fullname, national_id, phone, address FROM request_guarantors WHERE request_id = ? ORDER BY guarantor_no');
            $gStmt->execute([$req['id']]);
            $req['guarantors'] = $gStmt->fetchAll();

            // Get installments
            $instStmt = $pdo->prepare('SELECT i.* FROM installments i JOIN installment_plans ip ON ip.id = i.plan_id WHERE ip.request_id = ? ORDER BY i.installment_no');
            $instStmt->execute([$req['id']]);
            $req['installments'] = $instStmt->fetchAll();
        }
        unset($req);

        // Who this member has guaranteed
        $guaranteedStmt = $pdo->prepare("SELECT rg.request_id, rg.guarantor_no, r.amount_requested, r.status, m.fullname AS borrower_name, m.username AS borrower_code, fy.year_be
            FROM request_guarantors rg
            JOIN requests r ON r.id = rg.request_id
            JOIN members m ON m.id = r.member_id
            LEFT JOIN fiscal_years fy ON fy.id = r.fiscal_year_id
            WHERE rg.fullname = ? OR rg.national_id = ?
            ORDER BY r.created_at DESC");
        $guaranteedStmt->execute([$member['fullname'], $member['national_id'] ?? '---']);
        $guaranteedForOthers = $guaranteedStmt->fetchAll();

        json_response([
            'status' => 'success',
            'member' => $member,
            'summary' => [
                'total_requested' => $totalRequested,
                'total_payable' => $totalPayable,
                'total_paid' => $totalPaid,
                'remaining_debt' => max(0, $totalPayable - $totalPaid),
            ],
            'requests' => $requests,
            'guaranteed_for_others' => $guaranteedForOthers
        ]);
    }

    // 4. Project-wide Financial Summary
    if ($action === 'financial_summary') {
        require_role(['committee', 'president']);
        $year = (int)($_GET['year'] ?? (date('Y') + 543));
        $gregYear = $year - 543;

        $s = $pdo->prepare('SELECT id, year_be FROM fiscal_years WHERE year_be = ?');
        $s->execute([$year]);
        $fy = $s->fetch();
        $fyId = $fy ? (int)$fy['id'] : 0;

        // Loans summary
        $loanStmt = $pdo->prepare("SELECT
            COUNT(r.id) AS total_contracts,
            COALESCE(SUM(r.amount_requested), 0) AS total_principal,
            COALESCE(SUM(ip.interest_amount), 0) AS total_interest,
            COALESCE(SUM(ip.total_payable), 0) AS total_receivable
            FROM requests r
            LEFT JOIN installment_plans ip ON ip.request_id = r.id
            WHERE r.fiscal_year_id = ? AND r.status IN ('member_confirmed','active','completed')");
        $loanStmt->execute([$fyId]);
        $loans = $loanStmt->fetch();

        // Payments collected
        $payStmt = $pdo->prepare("SELECT COALESCE(SUM(p.amount), 0) AS total_collected
            FROM payments p
            JOIN requests r ON r.id = p.request_id
            WHERE r.fiscal_year_id = ? AND p.status = 'verified'");
        $payStmt->execute([$fyId]);
        $totalCollected = (float)$payStmt->fetchColumn();

        // Outstanding debt
        $totalReceivable = (float)$loans['total_receivable'];
        $totalOutstanding = max(0, $totalReceivable - $totalCollected);

        // Debt grouped by member risk status
        $riskStmt = $pdo->prepare("SELECT m.risk_status,
            COUNT(DISTINCT m.id) AS member_count,
            COALESCE(SUM(ip.total_payable), 0) AS payable,
            COALESCE(SUM(p.paid), 0) AS paid
            FROM requests r
            JOIN members m ON m.id = r.member_id
            LEFT JOIN installment_plans ip ON ip.request_id = r.id
            LEFT JOIN (
                SELECT request_id, SUM(amount) AS paid FROM payments WHERE status = 'verified' GROUP BY request_id
            ) p ON p.request_id = r.id
            WHERE r.fiscal_year_id = ? AND r.status IN ('member_confirmed','active','completed')
            GROUP BY m.risk_status");
        $riskStmt->execute([$fyId]);
        $debtByRisk = $riskStmt->fetchAll();

        // Ledger breakdown
        $ledgerStmt = $pdo->prepare('SELECT id, transaction_date, type, description, amount, reference FROM ledger WHERE YEAR(transaction_date) = ? ORDER BY transaction_date ASC');
        $ledgerStmt->execute([$gregYear]);
        $ledgerRows = $ledgerStmt->fetchAll();

        $incomeTotal = 0.0;
        $expenseTotal = 0.0;
        foreach ($ledgerRows as $row) {
            if ($row['type'] === 'income') {
                $incomeTotal += (float)$row['amount'];
            } else {
                $expenseTotal += (float)$row['amount'];
            }
        }

        json_response([
            'status' => 'success',
            'year' => $year,
            'loans' => [
                'total_contracts' => (int)$loans['total_contracts'],
                'total_principal' => (float)$loans['total_principal'],
                'total_interest' => (float)$loans['total_interest'],
                'total_receivable' => $totalReceivable,
                'total_collected' => $totalCollected,
                'total_outstanding' => $totalOutstanding,
            ],
            'debt_by_risk' => $debtByRisk,
            'ledger' => [
                'income' => $incomeTotal,
                'expense' => $expenseTotal,
                'balance' => $incomeTotal - $expenseTotal,
                'transactions' => $ledgerRows
            ]
        ]);
    }

    // 5. Official Form / Contract Printable Data
    if ($action === 'form_data') {
        $requestId = (int)($_GET['request_id'] ?? 0);
        if (!$requestId) json_response(['status' => 'error', 'message' => 'กรุณาระบุเลขที่คำขอ'], 422);

        $stmt = $pdo->prepare("SELECT r.*, m.fullname, m.national_id, m.phone, m.address, m.marital_status, m.spouse_name, m.username AS member_code, fy.year_be
            FROM requests r
            JOIN members m ON m.id = r.member_id
            LEFT JOIN fiscal_years fy ON fy.id = r.fiscal_year_id
            WHERE r.id = ?");
        $stmt->execute([$requestId]);
        $req = $stmt->fetch();
        if (!$req) json_response(['status' => 'error', 'message' => 'ไม่พบข้อมูลคำขอ'], 404);

        if ($user['role'] === 'member' && (int)$req['member_id'] !== (int)$user['id']) {
            json_response(['status' => 'error', 'message' => 'ไม่มีสิทธิ์เข้าถึงเอกสารนี้'], 403);
        }

        // Items
        $iStmt = $pdo->prepare('SELECT * FROM request_items WHERE request_id = ? ORDER BY id');
        $iStmt->execute([$requestId]);
        $items = $iStmt->fetchAll();

        // Guarantors
        $gStmt = $pdo->prepare('SELECT * FROM request_guarantors WHERE request_id = ? ORDER BY guarantor_no');
        $gStmt->execute([$requestId]);
        $guarantors = $gStmt->fetchAll();

        // Payment plan
        $pStmt = $pdo->prepare('SELECT * FROM installment_plans WHERE request_id = ? LIMIT 1');
        $pStmt->execute([$requestId]);
        $plan = $pStmt->fetch();

        // Installments
        $installments = [];
        if ($plan) {
            $instStmt = $pdo->prepare('SELECT * FROM installments WHERE plan_id = ? ORDER BY installment_no');
            $instStmt->execute([$plan['id']]);
            $installments = $instStmt->fetchAll();
        }

        // Officers (President and Committee members)
        $presStmt = $pdo->query("SELECT fullname FROM members WHERE role = 'president' AND is_active = 1 LIMIT 1");
        $presidentName = $presStmt->fetchColumn() ?: 'นายประธาน กองทุนหมู่บ้าน';

        $commStmt = $pdo->query("SELECT fullname FROM members WHERE role = 'committee' AND is_active = 1 LIMIT 3");
        $committeeNames = $commStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

        $amountNum = (float)$req['amount_requested'];
        $amountText = baht_text($amountNum);

        $totalPayableNum = $plan ? (float)$plan['total_payable'] : $amountNum;
        $totalPayableText = baht_text($totalPayableNum);

        json_response([
            'status' => 'success',
            'form_data' => [
                'request' => $req,
                'items' => $items,
                'guarantors' => $guarantors,
                'payment_plan' => $plan,
                'installments' => $installments,
                'amount_num' => $amountNum,
                'amount_text' => $amountText,
                'total_payable_num' => $totalPayableNum,
                'total_payable_text' => $totalPayableText,
                'officers' => [
                    'president' => $presidentName,
                    'committees' => $committeeNames,
                ],
                'village_info' => [
                    'name' => 'กองทุนหมู่บ้านแม่ยางตาล หมู่ที่ 5',
                    'subdistrict' => 'ตำบลแม่ยางตาล',
                    'district' => 'อำเภอร้องกวาง',
                    'province' => 'จังหวัดแพร่',
                    'full_address' => 'กองทุนหมู่บ้านแม่ยางตาล หมู่ที่ 5 ตำบลแม่ยางตาล อำเภอร้องกวาง จังหวัดแพร่'
                ]
            ]
        ]);
    }

    // 6. Member history (legacy compatibility)
    if ($action === 'member_history') {
        $memberId = (int)($_GET['member_id'] ?? 0);
        if ($user['role'] === 'member') $memberId = (int)$user['id'];
        if (!$memberId) json_response(['status' => 'error', 'message' => 'กรุณาเลือกสมาชิก'], 422);
        $s = $pdo->prepare('SELECT id, year_be, status, request_open FROM fiscal_years ORDER BY year_be DESC');
        $s->execute();
        $years = $s->fetchAll();
        $out = [];
        foreach ($years as $y) {
            $q = $pdo->prepare('SELECT COUNT(*) requests, COALESCE(SUM(amount_requested), 0) requested FROM requests WHERE member_id = ? AND fiscal_year_id = ?');
            $q->execute([$memberId, $y['id']]);
            $r = $q->fetch();
            $out[] = ['year' => $y['year_be'], 'requests' => (int)$r['requests'], 'requested' => (float)$r['requested']];
        }
        json_response(['status' => 'success', 'data' => $out]);
    }

    json_response(['status' => 'error', 'message' => 'ไม่พบคำสั่ง'], 400);
} catch (Throwable $e) {
    error_log($e->getMessage());
    json_response(['status' => 'error', 'message' => 'ไม่สามารถสร้างรายงานได้: ' . $e->getMessage()], 500);
}
