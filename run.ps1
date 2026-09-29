[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Port = $(if ($env:PORT) { [int]$env:PORT } else { 8000 })
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Venv = Join-Path $Backend ".venv"
$Python = Join-Path $Venv "Scripts\python.exe"
$Alembic = Join-Path $Venv "Scripts\alembic.exe"

Write-Host "==> Preparing ApnaDairy"

if (-not (Test-Path -LiteralPath $Python)) {
    Write-Host "--> Creating the Python virtual environment"
    if (Get-Command python -ErrorAction SilentlyContinue) {
        & python -m venv $Venv
    }
    elseif (Get-Command py -ErrorAction SilentlyContinue) {
        & py -3 -m venv $Venv
    }
    else {
        throw "Python 3.11 or newer is required."
    }
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "Node.js 18 or newer (including npm) is required."
}

Write-Host "--> Installing backend dependencies"
& $Python -m pip install -q -r (Join-Path $Backend "requirements.txt")
if ($LASTEXITCODE -ne 0) { throw "Backend dependency installation failed." }

Write-Host "--> Installing and building the frontend"
Push-Location $Frontend
try {
    if (Test-Path -LiteralPath (Join-Path $Frontend "node_modules")) {
        & npm install --no-audit --no-fund
    }
    else {
        & npm ci --no-audit --no-fund
    }
    if ($LASTEXITCODE -ne 0) { throw "Frontend dependency installation failed." }
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
}
finally {
    Pop-Location
}

Push-Location $Backend
try {
    $DatabaseUrl = (& $Python -c "from app.core.config import get_settings; print(get_settings().DATABASE_URL)").Trim()
    if ($LASTEXITCODE -ne 0) { throw "Could not read the database configuration." }

    if ($DatabaseUrl.StartsWith("sqlite:")) {
        Write-Host "--> Initialising/upgrading the local SQLite database"
        & $Alembic upgrade head
        if ($LASTEXITCODE -ne 0) { throw "Database migration failed." }
    }
    else {
        Write-Host "--> External PostgreSQL selected; automatic schema changes are disabled"
        Write-Host "    Apply backend/supabase_schema.sql in Supabase before starting."
    }

    $HasAdminSeed = $env:ADMIN_EMAIL -or $env:ADMIN_PASSWORD
    $HasSuperAdminSeed = $env:SUPERADMIN_EMAIL -or $env:SUPERADMIN_PASSWORD
    if ($HasAdminSeed -or $HasSuperAdminSeed) {
        if (-not $env:ADMIN_EMAIL -or -not $env:ADMIN_PASSWORD) {
            if ($HasAdminSeed) { throw "Both ADMIN_EMAIL and ADMIN_PASSWORD are required together." }
        }
        if (-not $env:SUPERADMIN_EMAIL -or -not $env:SUPERADMIN_PASSWORD) {
            if ($HasSuperAdminSeed) { throw "Both SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are required together." }
        }
        if ($DatabaseUrl.StartsWith("sqlite:") -or $env:APNADAIRY_SEED_LIVE -eq "1") {
            Write-Host "--> Seeding the database (safe to run repeatedly)"
            & $Python -m app.seed
            if ($LASTEXITCODE -ne 0) { throw "Database seed failed." }
        }
        else {
            Write-Warning "Seed skipped for external PostgreSQL. Set APNADAIRY_SEED_LIVE=1 to confirm."
        }
    }
    else {
        Write-Host "--> Seed skipped (set Admin and/or Super Admin credentials to enable it)"
    }

    Write-Host "--> Starting ApnaDairy at http://localhost:$Port"
    & $Python -m uvicorn app.main:app --host 0.0.0.0 --port $Port
}
finally {
    Pop-Location
}
