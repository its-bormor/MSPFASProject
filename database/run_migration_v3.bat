@echo off
setlocal
cd /d "%~dp0.."
set "PHP_EXE=D:\xampp\php\php.exe"
echo Running Village Fund procurement and delivery migration v3...
if not exist "%PHP_EXE%" (
 echo ERROR: PHP was not found at %PHP_EXE%
 pause
 exit /b 1
)
"%PHP_EXE%" database\migrate_v3_procurement.php
if errorlevel 1 (
 echo Migration failed.
 pause
 exit /b 1
)
echo Migration completed successfully.
pause
