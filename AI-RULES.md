# 🤖 AI-RULES & MASTER SPECIFICATION (คู่มือและข้อกำหนดหลักสำหรับ AI)
> **สำหรับ:** AI Agents ทุกตัว (Serena, ChatGPT ผ่าน MCP, Claude, Antigravity, GitHub Copilot ฯลฯ)  
> **วัตถุประสงค์:** เป็น Single Source of Truth รวมบริบท กฎเกณฑ์ นโยบายความปลอดภัย สถาปัตยกรรม และคู่มือการพัฒนาระบบทั้งหมดไว้ในไฟล์เดียว  
> **อัปเดตล่าสุด:** 14 พฤศจิกายน 2569

---

## 1. ข้อมูลภาพรวมและระบบเทคโนโลยี (Tech Stack Overview)

* **ชื่อโครงการ:** ระบบบริหารจัดการกองทุนหมู่บ้านและโครงการประชารัฐ (ปุ๋ย ยา และเมล็ดพันธุ์)
* **พื้นที่ดำเนินงาน:** กองทุนหมู่บ้านแม่ยางตาล หมู่ที่ 5 ต.แม่ยางตาล อ.ร้องกวาง จ.แพร่
* **ภาษาและโครงสร้าง:**
  * **Backend:** PHP 8.2+ (Vanilla PHP, PDO MySQL, Session-based Auth)
  * **Frontend:** Vanilla JavaScript (SPA), Custom CSS (Responsive, ฟอนต์ Sarabun), Bootstrap Icons
  * **Database:** MariaDB / MySQL
  * **Production Hosting:** InfinityFree (Web Server: Apache + PHP, MySQL Server)
  * **GitHub Repository:** `https://github.com/its-bormor/MSPFASProject.git` (Branch: `master`)
  * **Production URL:** `https://mspfasproject.lovestoblog.com`

---

## 2. กฎเหล็กที่ AI ทุกตัวต้องปฏิบัติตามอย่างเคร่งครัด (Strict AI Rules)

### 🔴 กฎข้อที่ 1: การแยกขาดระหว่าง Localhost กับ Production Database (ห้ามปนกันเด็ดขาด!)
1. **บนเครื่อง Localhost (XAMPP):**
   * ใช้ไฟล์ `config/.env` ในเครื่องเท่านั้น
   * เชื่อมต่อไปที่ MariaDB ในเครื่อง (`127.0.0.1:3306`, Database: `village_fund`)
   * **ห้ามสร้างไฟล์ `config/runtime.php` บนเครื่องเด็ดขาด!** เพราะ `config/database.php` จะอ่าน `runtime.php` ก่อน `.env` เสมอ ทำให้ Localhost พยายามต่อไปยัง InfinityFree แล้วเกิด Error ทันที
2. **บน Production (InfinityFree):**
   * ต้องมีไฟล์ `config/runtime.php` อยู่บนเซิร์ฟเวอร์ที่พาธ `/htdocs/config/runtime.php` เสมอ
   * **ไฟล์นี้สร้างด้วยมือผ่าน InfinityFree File Manager เท่านั้น** และอยู่ใน `.gitignore` รวมถึงถูก `exclude` จาก GitHub Actions FTP Deploy แล้ว
   * ข้อมูลใน `runtime.php` บน InfinityFree:
     ```php
     <?php
     return [
         'DB_HOST' => 'sql207.infinityfree.com',
         'DB_NAME' => 'if0_42755650_MSPFASProject',
         'DB_USER' => 'if0_42755650',
         'DB_PASS' => 'YOUR_INFINITYFREE_DB_PASSWORD',
         'DB_PORT' => '3306',
     ];
     ```
   * หากเข้าเว็บแล้วเจอ `"status":"error","message":"Database connection failed"` ให้สันนิษฐานว่าไฟล์ `runtime.php` หาย หรือรหัสผ่านไม่ตรง

### 🔴 กฎข้อที่ 2: ความปลอดภัยของข้อมูลลับ (Credential Security)
* **ห้ามเปิดเผยหรือ Commit รหัสผ่าน Database หรือ FTP ลงใน Git หรือแสดงใน Chat/Logs เด็ดขาด**
* ไฟล์คอนฟิกทุกชนิดที่มีรหัสผ่านจริง (`.env`, `runtime.php`) ต้องอยู่ใน `.gitignore`
* หากมีการ push ขึ้น Git ให้ตรวจสอบเสมอว่าไม่มี credential หลุดขึ้นไป

### 🔴 กฎข้อที่ 3: Local-First & Testing Workflow
* **พัฒนาและทดสอบบนเครื่อง Localhost ให้เสร็จสมบูรณ์ก่อนเสมอ** (`http://localhost:3000`)
* มีการ Commit ย่อยเพื่อบันทึกประวัติการพัฒนา (`git commit`) อย่างสม่ำเสมอ
* **ห้าม Push ขึ้น GitHub โดยพลการ** จนกว่าจะได้รับคำสั่งยืนยันจากผู้ใช้ หรือเมื่อผู้ใช้สั่งให้ deploy
* เมื่อ Push ขึ้น GitHub แล้ว GitHub Actions จะทำ FTP Deploy ขึ้น InfinityFree อัตโนมัติ (ใช้เวลาประมาณ 2-5 นาที)

### 🔴 กฎข้อที่ 4: UTF-8 และฟอนต์ภาษาไทย
* ทุกไฟล์โค้ด (PHP, JS, SQL, HTML, CSS, MD) ต้องบันทึกด้วยการเข้ารหัส **UTF-8 (Without BOM)**
* เอกสารรายงานราชการและหน้าจอ UI ใช้ฟอนต์ **Sarabun** เป็นหลัก

---

## 3. สภาพแวดล้อมและบัญชีทดสอบ (Environments & Test Accounts)

### 💻 Local Development
* **Start Server:** รันไฟล์ `start-localhost-3000.bat` หรือคำสั่ง:
  ```powershell
  & "D:\xampp\php\php.exe" -S 127.0.0.1:3000
  ```
* **URL:** `http://localhost:3000`
* **Health Check:** `http://localhost:3000/health.php`

### 🌐 Production (InfinityFree)
* **URL:** `https://mspfasproject.lovestoblog.com`
* **Health Check:** `https://mspfasproject.lovestoblog.com/health.php`
* **FTP Server:** `ftpupload.net` (Username: `if0_42755650`)
* **MySQL Server:** `sql207.infinityfree.com` (DB Name: `if0_42755650_MSPFASProject`, User: `if0_42755650`)

### 👥 บัญชีผู้ใช้งานระบบ (Test Accounts)
| สิทธิ์ (Role) | Username | Password | รายละเอียดการทำงาน |
|:---|:---|:---|:---|
| **ประธานกองทุน (Superadmin / President)** | `admin` | `1111` | นายสมเกียรติ ยางตาล — อนุมัติคำขอขั้นสุดท้าย, ปิดปีงบประมาณ, จัดการระบบ |
| **คณะกรรมการ (Committee - Finance)** | `comm01` | `123456` | นายประสิทธิ์ มงคลสุข — ตรวจคำขอ, บันทึกการเงิน, ออกใบเสร็จ |
| **คณะกรรมการ (Committee - Audit)** | `comm02` | `123456` | นางอำไพ แก้วทอง — ตรวจสอบเอกสารคำขอ, ตรวจสอบสต็อก |
| **คณะกรรมการ (Committee - Procurement)**| `comm03` | `123456` | นายสุวิทย์ คำมูล — จัดซื้อและบันทึกการส่งมอบปัจจัยการผลิต |
| **สมาชิกทั่วไป (50 รายชื่อ)** | `M001` - `M050` | `123456` | สมาชิกจำลอง มีข้อมูลบัตรประชาชน ที่อยู่ ประวัติคำขอกู้ยืมครบวงจร |

---

## 4. โครงสร้างฐานข้อมูลและระบบ Mock Data

### ตารางหลักในระบบ (`database/schema.sql`)
1. `fiscal_years` — ปีงบประมาณ, สถานะเปิด/ปิดรับคำขอ (`request_open`), บันทึกการสืบราคาตลาด (`market_survey_done`)
2. `members` — สมาชิกและเจ้าหน้าที่ (roles: `member`, `committee`, `president`), สถานะความเสี่ยง (`risk_status`: normal, suspended, deceased)
3. `catalog_items` — รายการสินค้า/ปัจจัยการผลิต (หมวด: fertilizer, medicine, seed, other) อิงตามปีงบประมาณ
4. `requests` — คำขอกู้ยืมเงิน/รับปัจจัยการผลิต
5. `request_items` — รายการสินค้าที่ขอในคำขอนั้นๆ (บันทึก Snapshot ราคา ณ วันขอ)
6. `request_guarantors` — ผู้ค้ำประกัน (รองรับ 1-3 คนตามระเบียบ)
7. `request_documents` — เอกสารแนบคำขอ
8. `installment_plans` — แผนการชำระ (ชำระก้อนเดียว `lump_sum` หรือแบ่งงวด `installment`, ดอกเบี้ย 6% ต่อปี)
9. `installments` — ตารางงวดชำระ (เงินต้น, ดอกเบี้ย, กำหนดชำระ, สถานะ)
10. `payments` — ประวัติการรับชำระเงิน (เงินสด/โอน พร้อมเลขที่ใบเสร็จหรือสลิป)
11. `ledger` — บัญชีรายรับ-รายจ่ายของกองทุน (income/expense)
12. `line_announcements` — บันทึกประวัติการส่งข่าวสาร/แจ้งเตือน
13. `audit_logs` — ประวัติการใช้งานระบบ (รวมถึงกรณีคณะกรรมการทำรายการแทนสมาชิก)

### การจัดการ Mock Data
* จำลองข้อมูลทดสอบครบถ้วน (50 สมาชิก, 47 คำขอครบทุกสถานะ, 59 การชำระเงิน, Ledger 9 รายการ):
  ```powershell
  & "D:\xampp\php\php.exe" database\seed_mock_data.php
  ```
  หรือดับเบิลคลิกไฟล์ `database\run_mock_seed.bat`

---

## 5. วงจรการทำงานทางธุรกิจ (Business Logic & Workflows)

### 1. วงจรชีวิตคำขอกู้ยืม (Loan Request Lifecycle)
```
[draft] (แบบร่าง)
   ↓
[submitted] (ยื่นคำขอ)
   ↓
[committee_review] → (ปฏิเสธ: committee_rejected / ขอแก้: revision_requested)
   ↓ (กรรมการเห็นชอบ)
[president_review] → (ประธานไม่อนุมัติ: president_rejected)
   ↓ (ประธานอนุมัติ)
[contract_pending] (รอลงนาม/ยืนยันสัญญา)
   ↓
[member_confirmed] / [active] (ยืนยันสัญญาและเริ่มผ่อนชำระ)
   ↓
[completed] (ชำระหนี้ครบถ้วน ปิดสัญญา)
```

### 2. แนวคิด Member Service Station
* ในทางปฏิบัติ สมาชิกผู้สูงอายุในหมู่บ้านอาจไม่มีสมาร์ทโฟนหรือไม่ถนัดการใช้งาน
* คณะกรรมการมีระบบ **Service Station** สามารถยื่นคำขอ บันทึกเอกสาร หรือจัดการรายการแทนสมาชิกได้ โดยระบุ `member_id`
* **ระบบไม่จำเป็นต้องถามรหัสผ่านของสมาชิก** แต่จะบันทึก `audit_logs` ว่ากรรมการท่านใดเป็นผู้ดำเนินการแทน

### 3. การคำนวณดอกเบี้ยและการเงิน
* ดอกเบี้ยเงินกู้โครงการประชารัฐกำหนดไว้ที่ **ร้อยละ 6 ต่อปี (6% per annum)**
* รองรับ 2 รูปแบบการชำระ:
  * **Lump sum:** ชำระเงินต้นพร้อมดอกเบี้ยรวมก้อนเดียวเมื่อสิ้นสุดสัญญา
  * **Installment:** ผ่อนชำระเป็นงวดรายเดือน/รายงวด

---

## 6. มาตรฐานระบบรายงานและเครื่องพิมพ์เอกสารราชการ (Print Engine Standard)

> โฟกัสหลักของระบบในปัจจุบันคือ **"รายงานและการพิมพ์เอกสารแบบฟอร์มทางการ"**

### ข้อกำหนดการพิมพ์ (Printing Rules):
1. **ขนาดกระดาษ:** จัดหน้าสำหรับ **A4 Portrait** (แนวตั้ง) มาตรฐานราชการ
2. **การสั่งพิมพ์:** ใช้ฟังก์ชัน `printDocumentHtml(html, title)` ใน `assets/js/main.js` ซึ่งพิมพ์ผ่าน Invisible Iframe โดยไม่ให้มีแถบเมนู ปุ่มกด หรือส่วนประกอบของเว็บไซต์ติดไปในเอกสาร
3. **ตราสัญลักษณ์ กทบ.:** ต้องใช้ Vector SVG โลโก้ กทบ. จากฟังก์ชัน `getKtbLogoSvg(size)` เสมอ (รูป 3 กล่อง ก-ท-บ สีดำ)
4. **ตัวเลขไทย:** ข้อมูลทางการในแบบฟอร์มราชการต้องแปลงตัวเลขอารบิกเป็นตัวเลขไทยด้วยฟังก์ชัน `toThaiDigits(val)`
5. **วันที่แบบไทย:** ใช้วันที่ภาษาไทยแบบเต็ม (เช่น ๑๔ พฤศจิกายน ๒๕๖๙) ด้วย `getThaiDateParts()`
6. **ตารางลายมือชื่อ:** ต้องมีช่องลงลายมือชื่อที่ชัดเจนถูกต้องตามตำแหน่ง (เช่น ผู้กู้, ประธาน, กรรมการเหรัญญิก, กรรมการตรวจสอบ, พยาน)

### รายงานทางการที่ทำเสร็จแล้ว:
* `printOfficialAnnualReport(year)` — รายงานสรุปผลการดำเนินงานประจำปีงบประมาณ
* `printOfficialMemberRoster(year)` — ทะเบียนสมาชิกและผู้กู้ยืมเงินประจำปี
* `printOfficialIndividualMember(memberId)` — รายงานข้อมูลสมาชิกและประวัติการกู้ยืมรายบุคคล
* `printOfficialFinancialReport(year)` — รายงานงบการเงิน งบรายรับ-รายจ่าย และงบดุลสภาพคล่อง

### งานที่ต้องทำต่อสำหรับแบบฟอร์มสัญญา (Next Session Task):
* ปรับปรุงฟังก์ชัน `generateFormHtml(type, d)` ใน `assets/js/main.js` ให้ตรงตามภาพต้นฉบับใน `Doc/pic/`:
  * **แบบ กทบ.๐๔:** สัญญากู้ยืมเงิน (๒ หน้า) — มีลายเซ็นกำกับข้างกระดาษทุกหน้า, ข้อตกลง ๑-๗, ตารางรายการสินค้า, ตารางงวดชำระ, ลายเซ็น ๓ ชุด
  * **แบบ กทบ.๐๕:** สัญญาค้ำประกันการกู้ยืมเงิน (๑ หน้า) — ผู้ค้ำประกัน ๒ คน, ลายเซ็นพยาน
  * **แบบ กทบ.๐๓:** คำรับรองและยินยอมของคู่สมรส (๑ หน้า)
  * **แบบ กทบ.๐๑/๐๒:** แบบคำขอกู้ยืมเงินเพื่อจัดหาปัจจัยการผลิต
  * **ตัวเลือก All-in-One:** เพิ่มปุ่มสั่งพิมพ์ชุดสัญญาครบเซ็ตในคลิกเดียว (กทบ.๐๔ + กทบ.๐๕ + กทบ.๐๓)

---

## 7. คู่มือการแก้ไขปัญหาที่พบบ่อย (Troubleshooting & Incident Playbook)

| อาการที่พบ | สาเหตุ | วิธีแก้ปัญหาที่ถูกต้อง |
|:---|:---|:---|
| **Localhost เข้าแล้ว Error หรือหมุนค้าง** | มีไฟล์ `config/runtime.php` อยู่ในเครื่อง Localhost ทำให้ระบบพยายามต่อ DB InfinityFree | **ลบไฟล์ `D:\Work\Project\config\runtime.php` ในเครื่องทิ้งทันที** แล้วทดสอบใหม่ |
| **เว็บ InfinityFree ขึ้น `เกิดข้อผิดพลาดของระบบ` หรือ `Database connection failed`** | ไฟล์ `htdocs/config/runtime.php` บน InfinityFree หายไป หรือ Password ไม่ถูกต้อง | เข้า InfinityFree Control Panel → File Manager → ไปที่ `htdocs/config/` → สร้างไฟล์ `runtime.php` ใส่ค่า DB credentials และ password ให้ถูกต้อง |
| **แก้โค้ดและ push ขึ้น GitHub แล้วแต่หน้าเว็บจริงยังเป็นเวอร์ชันเดิม** | Browser Cache ค้าง หรือ GitHub Actions ยัง deploy ไม่เสร็จ | 1. ตรวจสอบสถานะที่ GitHub Actions Tab<br>2. หาก Deploy สำเร็จแล้ว ให้กด `Ctrl + Shift + R` บนเบราว์เซอร์เพื่อ Hard Reload หรือเปิดผ่าน Incognito Window |
| **หน้าพิมพ์รายงานการเงินขึ้นยอด 0 ทั้งหมด** | ฟังก์ชัน JS แมปชื่อฟิลด์จาก API ไม่ตรง (`r.income_statement` vs `r.ledger`) | ตรวจสอบว่า `printOfficialFinancialReport()` แมปข้อมูลจาก `r.loans` และ `r.ledger` อย่างถูกต้อง |
| **Import SQL บน phpMyAdmin ของ InfinityFree แล้วขึ้น Error `#1044 Access denied for database 'village_fund'`** | ในไฟล์ SQL มีคำสั่ง `USE village_fund;` ซึ่งชื่อ DB บน InfinityFree ไม่ใช่ชื่อนี้ | ให้ลบหรือ Comment บรรทัด `USE village_fund;` ออก เพราะ phpMyAdmin ได้เลือกฐานข้อมูลเป้าหมายไว้อยู่แล้ว |

---

## 8. กฎการ Commit และบันทึกประวัติ (Git Guidelines)
* ให้ตั้งชื่อ Commit Message ตามหลัก **Conventional Commits**:
  * `feat: ...` สำหรับฟังก์ชันใหม่
  * `fix: ...` สำหรับการแก้ไขข้อผิดพลาดหรือบั๊ก
  * `docs: ...` สำหรับการปรับปรุงเอกสาร
  * `ci: ...` สำหรับการปรับปรุงไฟล์ Workflow / GitHub Actions
  * `refactor: ...` สำหรับการปรับโครงสร้างโค้ด
* ก่อน Commit ทุกครั้ง ตรวจสอบ `git status` เสมอว่าไม่มีไฟล์ส่วนตัว, รหัสผ่าน, หรือไฟล์ชั่วคราวติดเข้าไป
