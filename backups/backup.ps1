param(
  [string]$OutputDir = "",
  [switch]$SkipFirestore
)

$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\AI\Antigravity\FALPAT Ventas"

# Timestamp
$Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
if (-not $OutputDir) {
  $OutputDir = Join-Path $ProjectRoot "backups\backup-$Timestamp"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FALPAT SRL - Backup Completo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Directorio destino: $OutputDir" -ForegroundColor Yellow
Write-Host ""

# Create output directory
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# =====================
# 1. Source Code Backup
# =====================
Write-Host "[1/4] Respaldando codigo fuente..." -ForegroundColor Green

$SourceDir = Join-Path $OutputDir "source"
New-Item -ItemType Directory -Path $SourceDir -Force | Out-Null

$ExcludeDirs = @('node_modules', '.next', 'out', '.git', 'backups')
$IncludePatterns = @('*.*')

Get-ChildItem -Path $ProjectRoot -Directory | Where-Object { $_.Name -notin $ExcludeDirs } | ForEach-Object {
  Write-Host "  Copiando $_..."
  Copy-Item -Path $_.FullName -Destination (Join-Path $SourceDir $_.Name) -Recurse -Force -ErrorAction SilentlyContinue
}

# Include root config files
Get-ChildItem -Path $ProjectRoot -File | Where-Object {
  $_.Extension -in '.json', '.js', '.mjs', '.ts', '.env*', '.yml', '.yaml', '.gitignore', '.npmrc', '.nvmrc'
} | ForEach-Object {
  Copy-Item -Path $_.FullName -Destination $SourceDir -Force
}

Write-Host "  Codigo fuente respaldado." -ForegroundColor Gray

# =====================
# 2. Environment Backup
# =====================
Write-Host "[2/4] Respaldando variables de entorno..." -ForegroundColor Green

$EnvBackup = Join-Path $OutputDir "env"
New-Item -ItemType Directory -Path $EnvBackup -Force | Out-Null

if (Test-Path (Join-Path $ProjectRoot ".env.local")) {
  Copy-Item -Path (Join-Path $ProjectRoot ".env.local") -Destination (Join-Path $EnvBackup ".env.local") -Force
  Write-Host "  .env.local respaldado." -ForegroundColor Gray
} else {
  Write-Host "  WARN: .env.local no encontrado" -ForegroundColor Yellow
}

# =====================
# 3. Firestore Data Export
# =====================
if (-not $SkipFirestore) {
  Write-Host "[3/4] Exportando datos de Firestore..." -ForegroundColor Green

  $DataDir = Join-Path $OutputDir "firestore"
  New-Item -ItemType Directory -Path $DataDir -Force | Out-Null

  $ServiceAccount = Join-Path $ProjectRoot "backups\service-account.json"

  if (Test-Path $ServiceAccount) {
    Copy-Item -Path $ServiceAccount -Destination (Join-Path $DataDir "service-account.json") -Force

    Push-Location $ProjectRoot
    try {
      $env:NODE_OPTIONS = ""
      $result = node "scripts/export-firestore.mjs" $DataDir 2>&1
      $exitCode = $LASTEXITCODE
      Write-Host $result
      if ($exitCode -ne 0) {
        Write-Host "  ERROR: Fallo la exportacion de Firestore" -ForegroundColor Red
      } else {
        Write-Host "  Datos de Firestore exportados." -ForegroundColor Gray
      }
    } finally {
      Pop-Location
    }
  } else {
    Write-Host "  WARN: service-account.json no encontrado en backups/" -ForegroundColor Yellow
    Write-Host "  Los datos de Firestore NO fueron respaldados." -ForegroundColor Yellow
    Write-Host "  Para habilitar backup de datos:" -ForegroundColor Yellow
    Write-Host "  1. Firebase Console → Project Settings → Service Accounts" -ForegroundColor Yellow
    Write-Host "  2. Generate New Private Key" -ForegroundColor Yellow
    Write-Host "  3. Guardar como: $ServiceAccount" -ForegroundColor Yellow
  }
} else {
  Write-Host "[3/4] Firestore omitido (flag -SkipFirestore)" -ForegroundColor Green
}

# =====================
# 4. Manifest
# =====================
Write-Host "[4/4] Generando manifiesto..." -ForegroundColor Green

$Manifest = @{
  Project = "FALPAT SRL - Ventas"
  Source  = "https://github.com/ssaavedra1969-png/ventas"
  Date    = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
  NodeJS  = (node --version)
  NPM     = (npm --version)
  Includes = @{
    SourceCode  = $true
    Env         = $true
    Firestore   = (-not $SkipFirestore -and (Test-Path $ServiceAccount))
  }
  Collections = @()
}

# List backup size
$TotalSize = (Get-ChildItem -Path $OutputDir -Recurse | Measure-Object -Property Length -Sum).Sum
$Manifest.TotalSizeMB = [math]::Round($TotalSize / 1MB, 2)

# List Firestore collections if exported
$DataDir = Join-Path $OutputDir "firestore"
if (Test-Path $DataDir) {
  Get-ChildItem -Path $DataDir -Filter "*.json" | ForEach-Object {
    $Manifest.Collections += @{
      Name    = $_.BaseName
      SizeKB  = [math]::Round($_.Length / 1KB, 1)
      Records = (Get-Content $_.FullName -Raw | ConvertFrom-Json).Count
    }
  }
}

$ManifestPath = Join-Path $OutputDir "manifest.json"
$Manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $ManifestPath -Encoding UTF8

Write-Host "  Manifiesto generado." -ForegroundColor Gray

# =====================
# Summary
# =====================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BACKUP COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Destino:  $OutputDir" -ForegroundColor White
Write-Host "  Tamano:   $($Manifest.TotalSizeMB) MB" -ForegroundColor White
Write-Host ""
Write-Host "  Para restaurar datos de Firestore:" -ForegroundColor Yellow
Write-Host "    npm run restore -- $OutputDir\firestore" -ForegroundColor Yellow
Write-Host ""
