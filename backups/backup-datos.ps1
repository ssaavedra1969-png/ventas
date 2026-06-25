param(
  [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\AI\Antigravity\FALPAT Ventas"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
if (-not $OutputDir) {
  $OutputDir = Join-Path $ProjectRoot "backups\datos-$Timestamp"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FALPAT SRL - Backup de DATOS" -ForegroundColor Cyan
Write-Host "  (Firestore: clientes, productos," -ForegroundColor Cyan
Write-Host "   vendedores, remitos, contadores)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Destino: $OutputDir" -ForegroundColor Yellow
Write-Host ""

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# =====================
# 1. Service Account
# =====================
Write-Host "[1/3] Copiando service-account.json..." -ForegroundColor Green

$ServiceAccount = Join-Path $ProjectRoot "backups\service-account.json"

if (Test-Path $ServiceAccount) {
  Copy-Item -Path $ServiceAccount -Destination (Join-Path $OutputDir "service-account.json") -Force
  Write-Host "  service-account.json copiado." -ForegroundColor Gray
} else {
  Write-Host "  WARN: service-account.json no encontrado en backups/" -ForegroundColor Yellow
  Write-Host "  Los datos de Firestore NO podran exportarse." -ForegroundColor Yellow
  Write-Host "  Para habilitarlo:" -ForegroundColor Yellow
  Write-Host "  1. Firebase Console → Project Settings → Service Accounts" -ForegroundColor Yellow
  Write-Host "  2. Generate New Private Key" -ForegroundColor Yellow
  Write-Host "  3. Guardar como: $ServiceAccount" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  Re-ejecuta este script despues de tener el archivo." -ForegroundColor Yellow
  exit 1
}

# =====================
# 2. Firestore Export
# =====================
Write-Host "[2/3] Exportando datos de Firestore..." -ForegroundColor Green

$DataDir = Join-Path $OutputDir "firestore"
New-Item -ItemType Directory -Path $DataDir -Force | Out-Null

Push-Location $ProjectRoot
try {
  $env:NODE_OPTIONS = ""
  $result = node "scripts/export-firestore.mjs" $DataDir 2>&1
  $exitCode = $LASTEXITCODE
  Write-Host $result
  if ($exitCode -ne 0) {
    Write-Host "  ERROR: Fallo la exportacion de Firestore" -ForegroundColor Red
    exit 1
  }
  Write-Host "  Datos exportados correctamente." -ForegroundColor Gray
} finally {
  Pop-Location
}

# =====================
# 3. Manifest
# =====================
Write-Host "[3/3] Generando manifiesto..." -ForegroundColor Green

$Collections = @()
Get-ChildItem -Path $DataDir -Filter "*.json" | Where-Object { $_.Name -ne "service-account.json" } | ForEach-Object {
  $Collections += @{
    Name    = $_.BaseName
    SizeKB  = [math]::Round($_.Length / 1KB, 1)
    Records = (Get-Content $_.FullName -Raw | ConvertFrom-Json).Count
  }
}

$Manifest = @{
  Project     = "FALPAT SRL - Ventas"
  BackupType  = "datos"
  Date        = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
  NodeJS      = (node --version)
  NPM         = (npm --version)
  Collections = $Collections
}

$TotalSize = (Get-ChildItem -Path $DataDir -Recurse | Measure-Object -Property Length -Sum).Sum
$Manifest.TotalSizeKB = [math]::Round($TotalSize / 1KB, 1)

$ManifestPath = Join-Path $OutputDir "manifest.json"
$Manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $ManifestPath -Encoding UTF8

Write-Host "  Manifiesto generado." -ForegroundColor Gray

# =====================
# Summary
# =====================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BACKUP DE DATOS COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Destino:  $OutputDir" -ForegroundColor White
Write-Host "  Tamano:   $($Manifest.TotalSizeKB) KB" -ForegroundColor White
Write-Host ""
Write-Host "  Para restaurar estos datos:" -ForegroundColor Yellow
Write-Host "    npm run restore -- `"$DataDir`"" -ForegroundColor Yellow
Write-Host ""
