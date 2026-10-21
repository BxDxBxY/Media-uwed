# Run this AFTER fix-postgres.ps1 (no admin needed)
# This updates .env, runs migrations, and seeds the database

Write-Host "`n=== Finalizing Database Setup ===" -ForegroundColor Cyan

Write-Host "1. Updating .env file..." -ForegroundColor Yellow
$envContent = @"
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/media_uwed?schema=public"

# NextAuth
NEXTAUTH_SECRET="development-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Admin credentials
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin"
"@
Set-Content -Path "$PSScriptRoot\..\..\.env" -Value $envContent
Write-Host "   .env updated!" -ForegroundColor Green

Write-Host "`n2. Running Prisma migrations..." -ForegroundColor Yellow
# Run migrations using the project root
$cwd = Get-Location
Set-Location "$PSScriptRoot\..\.."
npx prisma migrate deploy
if ($LASTEXITCODE -eq 0) {
    Write-Host "   Migrations complete!" -ForegroundColor Green
} else {
    Write-Host "   ERROR: Migrations failed!" -ForegroundColor Red
    Set-Location $cwd
    pause
    exit 1
}

Write-Host "`n3. Seeding database..." -ForegroundColor Yellow
node seed-db.js
if ($LASTEXITCODE -eq 0) {
    Write-Host "   Database seeded!" -ForegroundColor Green
} else {
    Write-Host "   Seeding skipped (may already have data)" -ForegroundColor Yellow
}
Set-Location $cwd

Write-Host "`n=== All Done! ===" -ForegroundColor Green
Write-Host "Backend is now ready!" -ForegroundColor White
Write-Host "`nStart the dev server:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host "`nThen visit: http://localhost:3000" -ForegroundColor Yellow
pause
