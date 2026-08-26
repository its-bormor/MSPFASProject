@echo off
setlocal
cd /d "%~dp0.."

echo Running Village Fund database migration v2...
echo.

set "PHP_EXE=D:\xampp\php\php.exe"

if not exist "%PHP_EXE%" (
  echo ERROR: PHP was not found at:
  echo %PHP_EXE%
  echo.
  echo Please check that XAMPP is installed at D:\xampp and PHP exists.
  pause
  exit /b 1
)

"%PHP_EXE%" database\migrate_v2.php
if errorlevel 1 (
  echo.
  echo Migration failed. Check PHP and MySQL configuration.
  pause
  exit /b 1
)

echo.
echo Migration completed successfully.
pause
