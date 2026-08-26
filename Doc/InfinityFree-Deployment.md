# InfinityFree Deployment Guide

## เป้าหมาย
Production สำหรับระบบบริหารจัดการโครงการประชารัฐ ปุ๋ย ยา เมล็ดพันธุ์ กองทุนหมู่บ้านแม่ยางตาล

## ข้อสำคัญ
- InfinityFree ใช้สำหรับ Web/PHP/MySQL เท่านั้น
- Serena/DWP-MCP ไม่ควรติดตั้งบน Shared Hosting นี้
- Source of Truth สำหรับการพัฒนาคือ Git/เครื่องพัฒนา ไม่ใช่ไฟล์ที่อยู่บน Hosting
- ห้ามอัปโหลด `.git`, `.serena`, `database/`, `Doc/`, backup `.zip/.sql` หรือ secret ที่ไม่จำเป็นขึ้นเว็บ

## 1. สร้าง Hosting
1. สมัคร InfinityFree ด้วยบัญชีของผู้ใช้
2. สร้าง Hosting Account และเลือก Free Subdomain หรือโดเมนของตนเอง
3. เปิดใช้งาน SSL/HTTPS ก่อนเปิดใช้งานจริง
4. เปิด File Manager/FTP และ phpMyAdmin จาก Control Panel

## 2. สร้าง Database
สร้าง MySQL Database ใน Control Panel แล้วจดค่าจาก Account Details:
- DB_HOST: SQL hostname ของบัญชี
- DB_NAME: ชื่อฐานข้อมูลเต็มที่ระบบกำหนด
- DB_USER: username ของฐานข้อมูล
- DB_PASS: password ของ Hosting Account/Database ตามที่ Control Panel ระบุ

ห้ามใช้ `127.0.0.1` และ `root` บน Production

## 3. Import Database
1. เปิด phpMyAdmin ของฐานข้อมูล Production
2. Import SQL dump ที่สร้างจากเครื่องพัฒนา
3. ตรวจสอบตารางและข้อมูล seed
4. ห้ามรัน migration/reset ผ่าน URL บน Production

## 4. เตรียม config
สร้างไฟล์ `config/.env` บน Hosting (ไฟล์นี้ไม่อยู่ใน Git) เช่น:

DB_HOST=sqlXXX.infinityfree.com
DB_NAME=if0_xxxxx_village_fund
DB_USER=if0_xxxxx
DB_PASS=ใส่รหัสผ่านจริง

`config/.htaccess` จะป้องกันไม่ให้ browser ดาวน์โหลดไฟล์ config

## 5. Upload
อัปโหลดเฉพาะ runtime/application files:
- index.php
- api/
- assets/
- config/database.php
- config/.htaccess
- .htaccess
- uploads/.htaccess
- uploads/catalog/ (ถ้ามีไฟล์ runtime ที่ต้องการย้าย)
- uploads/slips/ (สร้างโฟลเดอร์ให้เขียนได้)

ไม่ต้องอัปโหลด:
- .git/
- .serena/
- database/
- Doc/
- Project_Backups/
- server.js
- start-localhost-3000.bat
- ไฟล์ backup SQL/ZIP

## 6. HTTPS
หลัง SSL ของโดเมน/ซับโดเมนทำงานและทดสอบ HTTP/HTTPS แล้ว จึงเปิด redirect HTTPS ใน `.htaccess` หากต้องการบังคับ HTTPS

## 7. ทดสอบ
ทดสอบตามลำดับ:
1. หน้า Login
2. Login member
3. Login committee
4. Station
5. Catalog + upload รูป
6. Request
7. Approval
8. Contract
9. Payment + slip
10. Procurement batch
11. Receiving inspection
12. Announcement
13. Member delivery status
14. Station delivery
15. Reports

## 8. Backup
ก่อนทุก Production migration:
- Export MySQL SQL dump
- Create Git checkpoint/tag
- เก็บ backup ไว้นอก Hosting

InfinityFree ไม่ควรเป็นที่เก็บ backup หลักของโครงการ

## 9. Serena / Remote Development
Serena จะติดตั้งบนเครื่อง/VM ที่ควบคุมได้แยกจาก InfinityFree แล้วเชื่อมกับ Git repository ของ Project ไม่เปิด Serena เป็น public endpoint บน Shared Hosting
