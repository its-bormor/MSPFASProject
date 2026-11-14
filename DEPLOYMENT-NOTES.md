# 📋 MSPFASProject — Deployment Notes

## 🌐 URLs
| รายการ | URL |
|--------|-----|
| เว็บไซต์ | https://mspfasproject.lovestoblog.com |
| GitHub Repo | https://github.com/its-bormor/MSPFASProject |
| GitHub Actions | https://github.com/its-bormor/MSPFASProject/actions |
| GitHub Secrets | https://github.com/its-bormor/MSPFASProject/settings/secrets/actions |

---

## 🗄️ InfinityFree Database

| รายการ | ค่า |
|--------|-----|
| DB Host | `sql207.infinityfree.com` |
| DB Name | `if0_42755650_MSPFASProject` |
| DB User | `if0_42755650` |
| DB Port | `3306` |
| DB Password | *(password ของ FTP / vPanel InfinityFree — ไม่บันทึกไว้ที่นี่)* |
| FTP Server | `ftpupload.net` |
| FTP Username | `if0_42755650` |

---

## ⚙️ GitHub Actions Secrets (ที่ตั้งไว้แล้ว)

| Secret Name | ค่า |
|-------------|-----|
| `FTP_SERVER` | `ftpupload.net` |
| `FTP_USERNAME` | `if0_42755650` |
| `FTP_PASSWORD` | password FTP ของ InfinityFree |

---

## 🔑 ไฟล์สำคัญ: `config/runtime.php`

> **⚠️ CAUTION:** ไฟล์นี้ **ต้องสร้างด้วยมือบน InfinityFree** เท่านั้น  
> ห้าม commit ขึ้น GitHub เด็ดขาด (อยู่ใน `.gitignore` แล้ว)  
> เพราะมี credentials ฐานข้อมูล

**ที่อยู่บน InfinityFree:** `htdocs/config/runtime.php`

**เนื้อหาไฟล์:**
```php
<?php
return [
    'DB_HOST' => 'sql207.infinityfree.com',
    'DB_NAME' => 'if0_42755650_MSPFASProject',
    'DB_USER' => 'if0_42755650',
    'DB_PASS' => 'ใส่_PASSWORD_จริงตรงนี้',
    'DB_PORT' => '3306',
];
```

**วิธีสร้างผ่าน InfinityFree File Manager:**
1. Control Panel → File Manager → ไปที่ `htdocs/config/`
2. กด **New File** → ตั้งชื่อ `runtime.php`
3. วางโค้ดด้านบน แก้ `DB_PASS` ให้ถูกต้อง → บันทึก

**เช็คว่า DB ใช้งานได้:**
```
https://mspfasproject.lovestoblog.com/health.php
```
- `"status":"success"` = ปกติ ✅
- `"status":"error"` = `runtime.php` หายหรือ password ผิด ❌

---

## 🚀 การ Deploy

### อัตโนมัติ — ทุกครั้งที่ push ขึ้น master
```bash
git add .
git commit -m "..."
git push origin master
```
GitHub Actions จะ deploy ขึ้น InfinityFree อัตโนมัติ (~2-5 นาที)  
ดูผล deploy ที่: https://github.com/its-bormor/MSPFASProject/actions

### สิ่งที่ **ไม่ถูก deploy** (exclude ใน `.github/workflows/deploy.yml`)
- `config/runtime.php` ← ต้องอยู่บน InfinityFree ตลอด **อย่าลบ!**
- `Doc/`, `Ps/`, `Ps.rar`, `Ps.zip`
- ไฟล์ `.md`, `Dockerfile`, `.dockerignore`

---

## 🗃️ Database Schema

**ไฟล์ schema:** `database/schema.sql` (import ผ่าน phpMyAdmin แล้ว ✅)

**วิธี import ใหม่ถ้าจำเป็น:**
1. InfinityFree Control Panel → phpMyAdmin
2. เลือก database `if0_42755650_MSPFASProject`
3. แท็บ **Import** → เลือกไฟล์ `database/schema.sql` → Go

> **หมายเหตุ:** error `USE village_fund` เป็นเรื่องปกติ ไม่กระทบ tables ครับ

---

## 🐛 Bugs ที่แก้แล้ว

| วันที่ | ปัญหา | วิธีแก้ |
|--------|--------|---------|
| 14 พ.ย. 2569 | หน้าพรินท์รายงานการเงินแสดงค่า 0 ทั้งหมด | แก้ `printOfficialFinancialReport()` ใน `assets/js/main.js` ให้ใช้ `r.loans` และ `r.ledger` แทน `r.income_statement` และ `r.balance_sheet` |
| 14 พ.ย. 2569 | `runtime.php` ถูก FTP deploy ลบทิ้ง | เพิ่ม `config/runtime.php` ใน exclude list ของ `.github/workflows/deploy.yml` |
| 14 พ.ย. 2569 | localhost ใช้งานไม่ได้หลังสร้าง `runtime.php` ในเครื่อง | ลบ `config/runtime.php` ออกจากเครื่อง — ไฟล์นี้ต้องอยู่แค่บน InfinityFree เท่านั้น |

---

## 💡 Tips แก้ปัญหา

| อาการ | สาเหตุ | วิธีแก้ |
|-------|--------|---------|
| localhost ใช้งานไม่ได้ | มี `config/runtime.php` ในเครื่อง | ลบไฟล์นั้นออก |
| เว็บ InfinityFree error ตั้งแต่เข้าหน้าแรก | `runtime.php` หายหรือ password ผิด | เช็ค `health.php` แล้วสร้าง/แก้ `runtime.php` ใหม่ |
| หน้าเว็บยังเป็นเวอร์ชั่นเก่า | Browser cache | กด `Ctrl + Shift + R` หรือเปิด Incognito |
| FTP Password คืออะไร | login ด้วย Google ไม่มี vPanel password | ตั้งเองที่ InfinityFree Control Panel → FTP Accounts → Change Password |
