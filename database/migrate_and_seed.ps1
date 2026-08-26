Set-Location (Join-Path $PSScriptRoot '..')
& 'D:\xampp\php\php.exe' 'database\migrate.php'
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& 'D:\xampp\php\php.exe' 'database\seed_admin.php'
exit $LASTEXITCODE
