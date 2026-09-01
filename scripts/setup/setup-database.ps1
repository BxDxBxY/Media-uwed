# PostgreSQL Database Setup Script for Media-uwed

Write-Host "Setting up PostgreSQL database for Media-uwed..." -ForegroundColor Cyan

# PostgreSQL connection details
$PGHOST = "localhost"
$PGPORT = "5432"
$PGUSER = "postgres"
$PGPASSWORD = "postgres"
$DBNAME = "media_uwed"

# Set PostgreSQL password environment variable
$env:PGPASSWORD = $PGPASSWORD

# Wait for PostgreSQL service to be ready
Write-Host "Waiting for PostgreSQL service to start..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$pgReady = $false

while (-not $pgReady -and $attempt -lt $maxAttempts) {
    $attempt++
    try {
        $result = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U $PGUSER -h $PGHOST -p $PGPORT -c "SELECT 1;" postgres 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pgReady = $true
            Write-Host "PostgreSQL is ready!" -ForegroundColor Green
        }
    } catch {
        Write-Host "Attempt $attempt/$maxAttempts - PostgreSQL not ready yet..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (-not $pgReady) {
    Write-Host "ERROR: PostgreSQL service did not start in time." -ForegroundColor Red
    exit 1
}

# Check if database exists
Write-Host "Checking if database '$DBNAME' exists..." -ForegroundColor Yellow
$dbExists = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U $PGUSER -h $PGHOST -p $PGPORT -tAc "SELECT 1 FROM pg_database WHERE datname='$DBNAME'" postgres

if ($dbExists -eq "1") {
    Write-Host "Database '$DBNAME' already exists." -ForegroundColor Green
} else {
    Write-Host "Creating database '$DBNAME'..." -ForegroundColor Yellow
    & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U $PGUSER -h $PGHOST -p $PGPORT -c "CREATE DATABASE $DBNAME;" postgres

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database '$DBNAME' created successfully!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Failed to create database." -ForegroundColor Red
        exit 1
    }
}

# Update .env file
Write-Host "Updating .env file..." -ForegroundColor Yellow
$envContent = @"
# Database
DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${DBNAME}?schema=public"

# NextAuth
NEXTAUTH_SECRET="development-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Admin credentials
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin"
"@

Set-Content -Path ".env" -Value $envContent
Write-Host ".env file updated!" -ForegroundColor Green

# Run Prisma migrations
Write-Host "Running Prisma migrations..." -ForegroundColor Yellow
npm run prisma migrate deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migrations completed successfully!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Migrations failed." -ForegroundColor Red
    exit 1
}

# Seed database
Write-Host "Seeding database with initial data..." -ForegroundColor Yellow
node seed-db.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database seeded successfully!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Seeding failed or was skipped." -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Database setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database: $DBNAME" -ForegroundColor White
Write-Host "Host: ${PGHOST}:${PGPORT}" -ForegroundColor White
Write-Host "User: $PGUSER" -ForegroundColor White
Write-Host "`nYou can now run: npm run dev" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan
