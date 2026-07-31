# 🔧 Fix Backend - Quick Guide

## Problem
The backend isn't working because PostgreSQL needs the correct password configured.

## Solution (2 Simple Steps)

### Step 1: Fix PostgreSQL Password (Requires Admin)
1. **Right-click PowerShell** → Select **"Run as Administrator"**
2. Navigate to project:
   ```powershell
   cd D:\Dev\Media\Media-uwed
   ```
3. Run the fix script:
   ```powershell
   .\scripts\setup\fix-postgres.ps1
   ```

This will:
- Reset PostgreSQL password to `postgres`
- Create the `media_uwed` database

### Step 2: Complete Setup (No Admin Needed)
1. Open a **normal PowerShell** (no admin needed)
2. Navigate to project:
   ```powershell
   cd D:\Dev\Media\Media-uwed
   ```
3. Run the completion script:
   ```powershell
   .\scripts\setup\complete-setup.ps1
   ```

This will:
- Update `.env` with correct credentials
- Run database migrations
- Seed initial data

### Step 3: Start Dev Server
```powershell
npm run dev
```

Visit: **http://localhost:3000**

---

## What Each Script Does

**fix-postgres.ps1** (needs admin):
- Temporarily disables password auth
- Sets postgres password to `postgres`
- Creates database
- Re-enables security

**complete-setup.ps1** (no admin):
- Updates .env file
- Runs Prisma migrations
- Seeds database with sample data

---

## Troubleshooting

**If scripts fail:**
1. Make sure PostgreSQL service is running:
   ```powershell
   Get-Service postgresql-x64-16
   ```

2. Check if database exists:
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -l
   ```

**Manual alternative:**
See `SETUP_DATABASE.md` for manual setup instructions using pgAdmin.
