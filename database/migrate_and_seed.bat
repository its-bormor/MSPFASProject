@echo off
cd /d "%~dp0.."
"D:\xampp\php\php.exe" database\migrate.php
if errorlevel 1 exit /b 1
"D:\xampp\php\php.exe" database\seed_admin.php
if errorlevel 1 exit /b 1
echo Setup complete.
echo Login: admin
echo Password: ChangeMe123!
