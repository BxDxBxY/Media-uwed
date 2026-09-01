# Quick PostgreSQL Password Reset & Database Setup
# RIGHT-CLICK PowerShell → Run as Administrator, then run this script

Write-Host "`n=== PostgreSQL Database Setup ===" -ForegroundColor Cyan

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Must run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell → 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

$PGBIN = "C:\Program Files\PostgreSQL\16\bin"
$PGHBA = "C:\Program Files\PostgreSQL\16\data\pg_hba.conf"
$PGHBA_BAK = "C:\Program Files\PostgreSQL\16\data\pg_hba.conf.bak"

Write-Host "1. Backing up pg_hba.conf..." -ForegroundColor Yellow
Copy-Item $PGHBA $PGHBA_BAK -Force

Write-Host "2. Enabling trust auth..." -ForegroundColor Yellow
(Get-Content $PGHBA) -replace 'scram-sha-256', 'trust' -replace 'md5', 'trust' | Set-Content $PGHBA

Write-Host "3. Restarting PostgreSQL..." -ForegroundColor Yellow
Restart-Service postgresql-x64-16
Start-Sleep 3

Write-Host "4. Setting password to 'postgres'..." -ForegroundColor Yellow
& "$PGBIN\psql.exe" -U postgres -h localhost -c "ALTER USER postgres PASSWORD 'postgres';"

Write-Host "5. Creating database 'media_uwed'..." -ForegroundColor Yellow
$dbExists = & "$PGBIN\psql.exe" -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='media_uwed'"
if ($dbExists -ne "1") {
    & "$PGBIN\psql.exe" -U postgres -h localhost -c "CREATE DATABASE media_uwed;"
    Write-Host "   Database created!" -ForegroundColor Green
} else {
    Write-Host "   Database already exists" -ForegroundColor Green
}

Write-Host "6. Restoring secure auth..." -ForegroundColor Yellow
Copy-Item $PGHBA_BAK $PGHBA -Force

Write-Host "7. Restarting PostgreSQL..." -ForegroundColor Yellow
Restart-Service postgresql-x64-16
Start-Sleep 3

Write-Host "`n=== Setup Complete! ===" -ForegroundColor Green
Write-Host "Password: postgres" -ForegroundColor White
Write-Host "Database: media_uwed" -ForegroundColor White
Write-Host "`nNow run in your project directory:" -ForegroundColor Yellow
Write-Host "  npx prisma migrate deploy" -ForegroundColor Cyan
Write-Host "  node seed-db.js" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Cyan
pause
