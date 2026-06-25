param(
  [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\AI\Antigravity\FALPAT Ventas"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
if (-not $OutputDir) {
  $OutputDir = Join-Path $ProjectRoot "backups\proyecto-$Timestamp"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FALPAT SRL - Backup de PROYECTO" -ForegroundColor Cyan
Write-Host "  (codigo fuente + config + entorno)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Destino: $OutputDir" -ForegroundColor Yellow
Write-Host ""

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# =====================
# 1. Source Code
# =====================
Write-Host "[1/3] Respaldando codigo fuente..." -ForegroundColor Green

$SourceDir = Join-Path $OutputDir "source"
New-Item -ItemType Directory -Path $SourceDir -Force | Out-Null

$ExcludeDirs = @('node_modules', '.next', 'out', '.git', 'backups', '.vercel')

# Copy directories
Get-ChildItem -Path $ProjectRoot -Directory | Where-Object { $_.Name -notin $ExcludeDirs } | ForEach-Object {
  Write-Host "  Copiando $($_.Name)..."
  Copy-Item -Path $_.FullName -Destination (Join-Path $SourceDir $_.Name) -Recurse -Force -ErrorAction SilentlyContinue
}

# Copy root config files
Get-ChildItem -Path $ProjectRoot -File | Where-Object {
  $_.Extension -in '.json', '.js', '.mjs', '.ts', '.yml', '.yaml', '.gitignore', '.npmrc', '.nvmrc'
} | ForEach-Object {
  Copy-Item -Path $_.FullName -Destination (Join-Path $SourceDir $_.Name) -Force
}

Write-Host "  Codigo fuente respaldado." -ForegroundColor Gray

# =====================
# 2. Environment Variables
# =====================
Write-Host "[2/3] Respaldando variables de entorno..." -ForegroundColor Green

$EnvDir = Join-Path $OutputDir "env"
New-Item -ItemType Directory -Path $EnvDir -Force | Out-Null

$envFile = Join-Path $ProjectRoot ".env.local"
if (Test-Path $envFile) {
  Copy-Item -Path $envFile -Destination (Join-Path $EnvDir ".env.local") -Force
  Write-Host "  .env.local respaldado." -ForegroundColor Gray
} else {
  Write-Host "  WARN: .env.local no encontrado" -ForegroundColor Yellow
}

# =====================
# 3. Manifest
# =====================
Write-Host "[3/3] Generando manifiesto..." -ForegroundColor Green

$Manifest = @{
  Project    = "FALPAT SRL - Ventas"
  BackupType = "proyecto"
  Date       = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
  Source     = "https://github.com/ssaavedra1969-png/ventas"
  NodeJS     = (node --version)
  NPM        = (npm --version)
  Includes   = @{
    SourceCode = $true
    Env        = (Test-Path $envFile)
  }
}

$TotalSize = (Get-ChildItem -Path $OutputDir -Recurse | Measure-Object -Property Length -Sum).Sum
$Manifest.TotalSizeMB = [math]::Round($TotalSize / 1MB, 2)

$ManifestPath = Join-Path $OutputDir "manifest.json"
$Manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $ManifestPath -Encoding UTF8

Write-Host "  Manifiesto generado." -ForegroundColor Gray

# =====================
# Summary
# =====================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BACKUP DE PROYECTO COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Destino:  $OutputDir" -ForegroundColor White
Write-Host "  Tamano:   $($Manifest.TotalSizeMB) MB" -ForegroundColor White
Write-Host ""
Write-Host "  Para restaurar el proyecto en otra PC:" -ForegroundColor Yellow
Write-Host "  1. Copiar la carpeta 'source' al directorio deseado" -ForegroundColor Yellow
Write-Host "  2. Copiar 'env/.env.local' a la raiz del proyecto" -ForegroundColor Yellow
Write-Host "  3. Ejecutar: npm install" -ForegroundColor Yellow
Write-Host "  4. Ejecutar: npm run dev" -ForegroundColor Yellow
Write-Host ""
