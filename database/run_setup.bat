@echo off
cd /d "%~dp0.."
echo [1/2] Migrating database...
"D:\xampp\php\php.exe" database\migrate.php
if errorlevel 1 goto :error
set "DEV_ADMIN_PASSWORD=ChangeMe123!"
echo [2/2] Preparing development account...
"D:\xampp\php\php.exe" database\seed_admin.php
if errorlevel 1 goto :error
echo.
echo Setup complete.
echo Login: admin
echo Password: ChangeMe123!
exit /b 0
:error
echo Database setup failed. Check XAMPP MySQL status.
exit /b 1
