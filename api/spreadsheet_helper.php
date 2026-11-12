<?php
declare(strict_types=1);

/**
 * Parses a CSV file into an array of rows (array of strings).
 * Automatically handles UTF-8 BOM and common delimiters (comma, tab, semicolon).
 */
function parse_csv_file(string $filePath): array {
    $rows = [];
    $handle = fopen($filePath, 'r');
    if (!$handle) return [];

    // Check UTF-8 BOM
    $bom = fread($handle, 3);
    if ($bom !== "\xEF\xBB\xBF") {
        rewind($handle);
    }

    // Auto-detect delimiter from first line
    $firstLine = fgets($handle);
    if ($firstLine === false) {
        fclose($handle);
        return [];
    }

    $delimiter = ',';
    $commaCount = substr_count($firstLine, ',');
    $semiCount = substr_count($firstLine, ';');
    $tabCount = substr_count($firstLine, "\t");

    if ($semiCount > $commaCount && $semiCount >= $tabCount) {
        $delimiter = ';';
    } elseif ($tabCount > $commaCount && $tabCount > $semiCount) {
        $delimiter = "\t";
    }

    // Parse the first line
    $firstRow = str_getcsv($firstLine, $delimiter, '"', "\\");
    if ($firstRow !== false) {
        $rows[] = array_map('trim', $firstRow);
    }

    // Read remaining lines
    while (($data = fgetcsv($handle, 4096, $delimiter, '"', "\\")) !== false) {
        // Skip empty lines
        if (count($data) === 1 && ($data[0] === null || trim((string)$data[0]) === '')) {
            continue;
        }
        $rows[] = array_map(fn($v) => trim((string)$v), $data);
    }
    fclose($handle);
    return $rows;
}

/**
 * Parses an Excel .xlsx file using PHP built-in ZipArchive and SimpleXML.
 * Returns an array of rows (array of strings).
 */
function parse_xlsx_file(string $filePath): array {
    if (!class_exists('ZipArchive')) {
        throw new RuntimeException('เซิร์ฟเวอร์ไม่รองรับ ZipArchive สำหรับอ่านไฟล์ Excel');
    }

    $zip = new ZipArchive();
    $res = $zip->open($filePath);
    if ($res !== true) {
        throw new RuntimeException('ไม่สามารถเปิดไฟล์ Excel ได้ (รหัสข้อผิดพลาด: ' . $res . ')');
    }

    // 1. Shared Strings Table
    $sharedStrings = [];
    $ssXml = $zip->getFromName('xl/sharedStrings.xml');
    if ($ssXml) {
        $xml = @simplexml_load_string($ssXml);
        if ($xml) {
            foreach ($xml->si as $si) {
                if (isset($si->t)) {
                    $sharedStrings[] = (string)$si->t;
                } elseif (isset($si->r)) {
                    $t = '';
                    foreach ($si->r as $r) {
                        $t .= (string)$r->t;
                    }
                    $sharedStrings[] = $t;
                } else {
                    $sharedStrings[] = '';
                }
            }
        }
    }

    // 2. Sheet 1 XML
    $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
    if (!$sheetXml) {
        // Fallback: try finding first sheet in workbook
        for ($i = 1; $i <= 5; $i++) {
            $sheetXml = $zip->getFromName("xl/worksheets/sheet{$i}.xml");
            if ($sheetXml) break;
        }
    }

    $rows = [];
    if ($sheetXml) {
        $xml = @simplexml_load_string($sheetXml);
        if ($xml && isset($xml->sheetData->row)) {
            foreach ($xml->sheetData->row as $row) {
                $r = [];
                $colIdx = 0;
                foreach ($row->c as $c) {
                    $rAttr = (string)$c['r'];
                    preg_match('/([A-Z]+)(\d+)/', $rAttr, $m);
                    if (!empty($m[1])) {
                        $colLetters = $m[1];
                        $targetIdx = 0;
                        for ($k = 0; $k < strlen($colLetters); $k++) {
                            $targetIdx = $targetIdx * 26 + (ord($colLetters[$k]) - 64);
                        }
                        $targetIdx--;
                        while ($colIdx < $targetIdx) {
                            $r[] = '';
                            $colIdx++;
                        }
                    }

                    $type = (string)$c['t'];
                    $val = (string)$c->v;
                    if ($type === 's') {
                        $idx = (int)$val;
                        $cellVal = $sharedStrings[$idx] ?? '';
                    } elseif ($type === 'inlineStr' && isset($c->is->t)) {
                        $cellVal = (string)$c->is->t;
                    } else {
                        $cellVal = $val;
                    }

                    $r[] = trim((string)$cellVal);
                    $colIdx++;
                }

                // Check if row has any non-empty data
                $hasData = false;
                foreach ($r as $cell) {
                    if ($cell !== '') {
                        $hasData = true;
                        break;
                    }
                }
                if ($hasData) {
                    $rows[] = $r;
                }
            }
        }
    }

    $zip->close();
    return $rows;
}

/**
 * Normalizes member header names into internal column keys.
 */
function normalize_member_headers(array $headerRow): array {
    $map = [
        'username' => ['username', 'user', 'รหัสสมาชิก', 'ชื่อผู้ใช้', 'เลขสมาชิก', 'รหัส'],
        'fullname' => ['fullname', 'name', 'ชื่อ-นามสกุล', 'ชื่อ-สกุล', 'ชื่อ นามสกุล', 'ชื่อและนามสกุล', 'ชื่อสกุล'],
        'national_id' => ['national_id', 'id_card', 'เลขบัตรประชาชน', 'เลขบัตรประจำตัวประชาชน', 'เลขประจำตัวประชาชน', 'เลขบัตร'],
        'phone' => ['phone', 'tel', 'mobile', 'โทรศัพท์', 'เบอร์โทร', 'เบอร์โทรศัพท์', 'มือถือ'],
        'password' => ['password', 'pass', 'รหัสผ่าน', 'password_init'],
        'role' => ['role', 'บทบาท', 'ตำแหน่ง', 'ระดับสิทธิ์'],
        'marital_status' => ['marital_status', 'สถานะสมรส', 'สถานภาพ', 'สมรส'],
        'spouse_name' => ['spouse_name', 'spouse', 'ชื่อคู่สมรส', 'คู่สมรส'],
        'address' => ['address', 'ที่อยู่', 'บ้านเลขที่'],
        'risk_status' => ['risk_status', 'risk', 'สถานะความเสี่ยง', 'สถานะสมาชิก', 'ความเสี่ยง'],
    ];

    $colKeyMap = [];
    foreach ($headerRow as $colIdx => $headerVal) {
        $clean = mb_strtolower(trim((string)$headerVal), 'UTF-8');
        $clean = str_replace([' ', '_', '-'], '', $clean);
        foreach ($map as $key => $aliases) {
            foreach ($aliases as $alias) {
                $cleanAlias = str_replace([' ', '_', '-'], '', mb_strtolower($alias, 'UTF-8'));
                if ($clean === $cleanAlias) {
                    $colKeyMap[$colIdx] = $key;
                    break 2;
                }
            }
        }
    }
    return $colKeyMap;
}
