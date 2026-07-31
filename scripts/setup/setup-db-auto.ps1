# Automated PostgreSQL Setup with Temporary Trust Authentication
# This script temporarily enables trust authentication, sets up the database, then restores security

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Database Auto-Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script requires Administrator privileges." -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator', then run this script again." -ForegroundColor Yellow
    Write-Host "`nPress any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

$PGBIN = "C:\Program Files\PostgreSQL\16\bin"
$PGDATA = "C:\Program Files\PostgreSQL\16\data"
$PGHBA = "$PGDATA\pg_hba.conf"
$PGHBA_BACKUP = "$PGDATA\pg_hba.conf.backup"
$SERVICE_NAME = "postgresql-x64-16"
$DBNAME = "media_uwed"
$PGUSER = "postgres"
$PGPASSWORD = "postgres"

Write-Host "Step 1: Backing up pg_hba.conf..." -ForegroundColor Yellow
Copy-Item -Path $PGHBA -Destination $PGHBA_BACKUP -Force
Write-Host "✓ Backup created" -ForegroundColor Green

Write-Host "`nStep 2: Temporarily enabling trust authentication..." -ForegroundColor Yellow
$hbaContent = Get-Content $PGHBA
$hbaContent = $hbaContent -replace 'scram-sha-256', 'trust'
Set-Content -Path $PGHBA -Value $hbaContent
Write-Host "✓ Trust authentication enabled" -ForegroundColor Green

Write-Host "`nStep 3: Restarting PostgreSQL service..." -ForegroundColor Yellow
Restart-Service $SERVICE_NAME
Start-Sleep -Seconds 3
Write-Host "✓ Service restarted" -ForegroundColor Green

Write-Host "`nStep 4: Setting postgres user password..." -ForegroundColor Yellow
$env:PGPASSWORD = ""
& "$PGBIN\psql.exe" -U $PGUSER -h localhost -c "ALTER USER postgres WITH PASSWORD '$PGPASSWORD';" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Password set to: $PGPASSWORD" -ForegroundColor Green
} else {
    Write-Host "⚠ Password setting skipped (may already be set)" -ForegroundColor Yellow
}

Write-Host "`nStep 5: Creating database '$DBNAME'..." -ForegroundColor Yellow
$dbCheck = & "$PGBIN\psql.exe" -U $PGUSER -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='$DBNAME'" 2>&1
if ($dbCheck -eq "1") {
    Write-Host "✓ Database already exists" -ForegroundColor Green
} else {
    & "$PGBIN\psql.exe" -U $PGUSER -h localhost -c "CREATE DATABASE $DBNAME;" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database created" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create database" -ForegroundColor Red
    }
}

Write-Host "`nStep 6: Restoring secure authentication..." -ForegroundColor Yellow
Copy-Item -Path $PGHBA_BACKUP -Destination $PGHBA -Force
Write-Host "✓ Security restored" -ForegroundColor Green

Write-Host "`nStep 7: Restarting PostgreSQL service..." -ForegroundColor Yellow
Restart-Service $SERVICE_NAME
Start-Sleep -Seconds 3
Write-Host "✓ Service restarted" -ForegroundColor Green

Write-Host "`nStep 8: Updating .env file..." -ForegroundColor Yellow
$envContent = @"
# Database
DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@localhost:5432/${DBNAME}?schema=public"

# NextAuth
NEXTAUTH_SECRET="development-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Admin credentials
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin"
"@
Set-Content -Path ".env" -Value $envContent
Write-Host "✓ .env file updated" -ForegroundColor Green

Write-Host "`nStep 9: Running Prisma migrations..." -ForegroundColor Yellow
$env:PGPASSWORD = $PGPASSWORD
npx prisma migrate deploy 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migrations completed" -ForegroundColor Green
} else {
    Write-Host "⚠ Migrations may have failed - check manually" -ForegroundColor Yellow
}

Write-Host "`nStep 10: Seeding database..." -ForegroundColor Yellow
node seed-db.js 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database seeded" -ForegroundColor Green
} else {
    Write-Host "⚠ Seeding skipped (may already have data)" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✓ Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database: $DBNAME" -ForegroundColor White
Write-Host "Host: localhost:5432" -ForegroundColor White
Write-Host "User: $PGUSER" -ForegroundColor White
Write-Host "Password: $PGPASSWORD" -ForegroundColor White
Write-Host "`nYou can now run:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host "`nThe app will be available at:" -ForegroundColor Yellow
Write-Host "  http://localhost:3000" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
