param(
  [switch]$SkipFirestore
)

$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\AI\Antigravity\FALPAT Ventas"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FALPAT SRL - Backup Completo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Timestamp: $Timestamp" -ForegroundColor Yellow
Write-Host ""

$DataDir = Join-Path $ProjectRoot "backups\datos-$Timestamp"
$ProyectoDir = Join-Path $ProjectRoot "backups\proyecto-$Timestamp"

# =====================
# 1. Backup de DATOS
# =====================
if (-not $SkipFirestore) {
  Write-Host "[1/2] Respaldando DATOS (Firestore)..." -ForegroundColor Green
  & "$ProjectRoot\backups\backup-datos.ps1" -OutputDir $DataDir
} else {
  Write-Host "[1/2] Datos omitido (flag -SkipFirestore)" -ForegroundColor Yellow
}

# =====================
# 2. Backup de PROYECTO
# =====================
Write-Host "[2/2] Respaldando PROYECTO (codigo + entorno)..." -ForegroundColor Green
& "$ProjectRoot\backups\backup-proyecto.ps1" -OutputDir $ProyectoDir

# =====================
# Summary
# =====================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BACKUP COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $SkipFirestore) {
  $DataSize = (Get-ChildItem -Path $DataDir -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
  Write-Host "  Datos:    $DataDir" -ForegroundColor White
  Write-Host "  Tamano:   $([math]::Round($DataSize / 1KB, 1)) KB" -ForegroundColor White
  Write-Host ""
}

$ProyectoSize = (Get-ChildItem -Path $ProyectoDir -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Write-Host "  Proyecto: $ProyectoDir" -ForegroundColor White
Write-Host "  Tamano:   $([math]::Round($ProyectoSize / 1MB, 2)) MB" -ForegroundColor White
Write-Host ""
Write-Host "  Para restaurar datos:" -ForegroundColor Yellow
Write-Host "    npm run restore -- `"$DataDir\firestore`"" -ForegroundColor Yellow
Write-Host "  Para restaurar proyecto:" -ForegroundColor Yellow
Write-Host "    1. Copiar '$ProyectoDir\source' al directorio deseado" -ForegroundColor Yellow
Write-Host "    2. Copiar '$ProyectoDir\env\.env.local' a la raiz" -ForegroundColor Yellow
Write-Host "    3. Ejecutar: npm install" -ForegroundColor Yellow
Write-Host ""
