@echo off
cd /d "%~dp0.."
echo Seeding mock data for Village Fund project...
"D:\xampp\php\php.exe" database\seed_mock_data.php
if errorlevel 1 goto :fail
echo.
echo Seeding completed successfully.
pause
exit /b 0

:fail
echo.
echo Seeding failed. Ensure XAMPP MySQL is running.
pause
exit /b 1
