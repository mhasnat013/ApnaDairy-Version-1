[CmdletBinding()]
param(
    [switch]$ReinstallDependencies
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Venv = Join-Path $Backend ".venv"
$Python = Join-Path $Venv "Scripts\python.exe"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "Node.js 18 or newer (including npm) is required."
}

if (-not (Test-Path -LiteralPath $Python)) {
    Write-Host "--> Creating the Python virtual environment"
    if (Get-Command py -ErrorAction SilentlyContinue) { & py -3 -m venv $Venv }
    elseif (Get-Command python -ErrorAction SilentlyContinue) { & python -m venv $Venv }
    else { throw "Python 3.11 or newer is required." }
}

Write-Host "--> Installing backend dependencies"
& $Python -m pip install -r (Join-Path $Backend "requirements.txt")
if ($LASTEXITCODE -ne 0) { throw "Backend dependency installation failed." }

Push-Location $Frontend
try {
    Write-Host "--> Installing frontend dependencies"
    if ($ReinstallDependencies -or -not (Test-Path -LiteralPath (Join-Path $Frontend "node_modules"))) {
        if ($ReinstallDependencies) { & npm install --no-audit --no-fund }
        else { & npm ci --no-audit --no-fund }
        if ($LASTEXITCODE -ne 0) { throw "Frontend dependency installation failed." }
    }
    else { Write-Host "    node_modules already exists; skipping npm install." }
    Write-Host "--> Building frontend"
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
}
finally { Pop-Location }

Write-Host "Setup complete. Start with .\run.ps1 or .\start.ps1."
