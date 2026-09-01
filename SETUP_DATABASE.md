# PostgreSQL Setup Guide for Media-uwed

> [!NOTE]
> All database setup, recovery, and test scripts (like `fix-postgres.ps1`, `complete-setup.ps1`, etc.) have been moved to the [scripts/setup/](file:///d:/Dev/Media/Media-uwed/scripts/setup) directory to keep the root directory clean.

## Current Status
✅ PostgreSQL 16 is installed at: `C:\Program Files\PostgreSQL\16`
✅ PostgreSQL service is running: `postgresql-x64-16`
❌ Database connection needs password configuration

## Quick Setup Steps

### Option 1: Use pgAdmin (Recommended for Windows)

1. Open **pgAdmin 4** (should be installed with PostgreSQL)
   - Start Menu → PostgreSQL 16 → pgAdmin 4

2. Connect to the server:
   - Right-click "Servers" → Register → Server
   - Name: `Local`
   - Connection tab:
     - Host: `localhost`
     - Port: `5432`
     - Username: `postgres`
     - Password: (enter the password you set during installation)

3. Create the database:
   - Right-click "Databases" → Create → Database
   - Database name: `media_uwed`
   - Click "Save"

4. Update the `.env` file in the project with your password:
   ```
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/media_uwed?schema=public"
   ```

5. Run migrations and seed:
   ```powershell
   npx prisma migrate deploy
   node seed-db.js
   ```

### Option 2: Command Line Setup

If you know your PostgreSQL password, run these commands:

```powershell
# Set your password
$env:PGPASSWORD = "YOUR_PASSWORD_HERE"

# Create database
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE media_uwed;"

# Update .env file (replace YOUR_PASSWORD_HERE)
@"
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/media_uwed?schema=public"
NEXTAUTH_SECRET="development-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin"
"@ | Set-Content .env

# Run migrations
npx prisma migrate deploy

# Seed database
node seed-db.js
```

### Option 3: Reset PostgreSQL Password

If you forgot the password:

1. Open `C:\Program Files\PostgreSQL\16\data\pg_hba.conf` as Administrator
2. Find the line: `host    all             all             127.0.0.1/32            scram-sha-256`
3. Change `scram-sha-256` to `trust`
4. Restart PostgreSQL service:
   ```powershell
   Restart-Service postgresql-x64-16
   ```
5. Connect without password and set a new one:
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -c "ALTER USER postgres PASSWORD 'postgres';"
   ```
6. Change `trust` back to `scram-sha-256` in pg_hba.conf
7. Restart service again

## After Database Setup

Once the database is configured, start the dev server:

```powershell
npm run dev
```

The application will be available at: http://localhost:3000

## Verify Setup

Check if everything works:
```powershell
# Test database connection
npx prisma db pull

# Check if tables exist
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -d media_uwed -c "\dt"
```
