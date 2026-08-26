@echo off
setlocal
set "ROOT=%~dp0.."
set "BACKUP_DIR=%ROOT%_Backups"
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set TODAY=%%c%%a%%b
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set NOW=%%a%%b
set "STAMP=%TODAY%_%NOW%"
set "STAMP=%STAMP::=%"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Creating project archive...
powershell -NoProfile -Command "Compress-Archive -Path '%ROOT%\*' -DestinationPath '%BACKUP_DIR%\Project_%STAMP%.zip' -Force"
if errorlevel 1 goto :fail

echo Creating MySQL dump...
"D:\xampp\mysql\bin\mysqldump.exe" -u root village_fund > "%BACKUP_DIR%\village_fund_%STAMP%.sql"
if errorlevel 1 goto :fail

echo Backup completed:
echo %BACKUP_DIR%\Project_%STAMP%.zip
echo %BACKUP_DIR%\village_fund_%STAMP%.sql
goto :done

:fail
echo Backup failed. Check XAMPP/MySQL and paths.
exit /b 1

:done
endlocal
