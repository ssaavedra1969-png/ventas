<#
.SYNOPSIS
  Bootstrap automático para FALPAT Ventas en una PC nueva.
  Clona el repo, instala dependencias, y te guía para copiar las credenciales.

.DESCRIPTION
  Este script prepara el entorno de desarrollo completo.
  Requiere: Node.js 18+, Git, y los archivos .env.local + service-account.json
  desde la PC original.

.EXAMPLE
  .\scripts\setup-nueva-pc.ps1
#>

$ErrorActionPreference = 'Stop'
$REPO_URL = 'https://github.com/ssaavedra1969-png/ventas.git'
$PROJECT_DIR = Join-Path $HOME 'ventas'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FALPAT Ventas - Setup Nueva PC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --------------------------------------------------
# 1. Verificar prerequisitos
# --------------------------------------------------
Write-Host "[1/5] Verificando prerequisitos..." -ForegroundColor Yellow

$hasNode = $false
try {
  $v = node --version
  $hasNode = $true
  Write-Host "  Node.js: $v" -ForegroundColor Green
} catch {
  Write-Host "  Node.js: NO INSTALADO" -ForegroundColor Red
  Write-Host "  Descargalo de: https://nodejs.org/" -ForegroundColor Red
  Write-Host "  (versión 18 o superior)"
}

$hasGit = $false
try {
  $v = git --version
  $hasGit = $true
  Write-Host "  Git: $v" -ForegroundColor Green
} catch {
  Write-Host "  Git: NO INSTALADO" -ForegroundColor Red
  Write-Host "  Descargalo de: https://git-scm.com/" -ForegroundColor Red
}

if (-not $hasNode -or -not $hasGit) {
  Write-Host "`nInstalá los prerequisitos faltantes y ejecutá de nuevo." -ForegroundColor Red
  exit 1
}

Write-Host ""

# --------------------------------------------------
# 2. Clonar repositorio
# --------------------------------------------------
Write-Host "[2/5] Clonando repositorio..." -ForegroundColor Yellow

if (Test-Path $PROJECT_DIR) {
  Write-Host "  El directorio $PROJECT_DIR ya existe." -ForegroundColor Yellow
  $opcion = Read-Host "  ¿Actualizar con 'git pull'? (S/n)"
  if ($opcion -ne 'n' -and $opcion -ne 'N') {
    Push-Location $PROJECT_DIR
    git pull
    Pop-Location
    Write-Host "  Repositorio actualizado." -ForegroundColor Green
  }
} else {
  git clone $REPO_URL $PROJECT_DIR
  Write-Host "  Repositorio clonado en: $PROJECT_DIR" -ForegroundColor Green
}

Write-Host ""

# --------------------------------------------------
# 3. Copiar credenciales
# --------------------------------------------------
Write-Host "[3/5] Credenciales necesarias" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Necesitás copiar 2 archivos desde la PC ORIGINAL:" -ForegroundColor White
Write-Host "    Archivo 1: .env.local" -ForegroundColor White
Write-Host "    Archivo 2: backups/service-account.json" -ForegroundColor White
Write-Host ""
Write-Host "  Copialos desde la PC original por USB, Google Drive, etc." -ForegroundColor Yellow
Write-Host "  Destinos:" -ForegroundColor White
Write-Host "    $PROJECT_DIR\\.env.local" -ForegroundColor Cyan
Write-Host "    $PROJECT_DIR\\backups\\service-account.json" -ForegroundColor Cyan
Write-Host ""

$credsOk = $true
if (-not (Test-Path (Join-Path $PROJECT_DIR '.env.local'))) {
  Write-Host "  ⚠️  .env.local NO encontrado" -ForegroundColor Red
  $credsOk = $false
} else {
  Write-Host "  ✅ .env.local encontrado" -ForegroundColor Green
}
if (-not (Test-Path (Join-Path $PROJECT_DIR 'backups\service-account.json'))) {
  Write-Host "  ⚠️  service-account.json NO encontrado" -ForegroundColor Red
  $credsOk = $false
} else {
  Write-Host "  ✅ service-account.json encontrado" -ForegroundColor Green
}

if (-not $credsOk) {
  Write-Host ""
  Write-Host "  Los archivos faltantes se pueden obtener:" -ForegroundColor Yellow
  Write-Host "  1. Firebase Console → Project Settings → Service Accounts → Generate New Private Key"
  Write-Host "  2. Firebase Console → Project Settings → Your apps → Web app → Config"
  Write-Host "  Copialos a las rutas indicadas y ejecutá de nuevo." -ForegroundColor Yellow
}
Write-Host ""

# --------------------------------------------------
# 4. Instalar dependencias
# --------------------------------------------------
Write-Host "[4/5] Instalando dependencias (npm install)..." -ForegroundColor Yellow
Push-Location $PROJECT_DIR
npm install
if ($LASTEXITCODE -ne 0) {
  Write-Host "  Error al instalar dependencias." -ForegroundColor Red
  Pop-Location
  exit 1
}
Pop-Location
Write-Host "  Dependencias instaladas." -ForegroundColor Green
Write-Host ""

# --------------------------------------------------
# 5. Resumen final
# --------------------------------------------------
Write-Host "[5/5] ¡Setup completado!" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FALPAT Ventas - Listo para usar" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Para DESARROLLAR (localhost):" -ForegroundColor White
Write-Host "    cd $PROJECT_DIR" -ForegroundColor Cyan
Write-Host "    npm run dev" -ForegroundColor Cyan
Write-Host "    -> http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Para USAR (producción):" -ForegroundColor White
Write-Host "    https://ventas-falpat.vercel.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Comandos útiles:" -ForegroundColor White
Write-Host "    npm run build     # Build producción" -ForegroundColor Cyan
Write-Host "    npm run backup    # Exportar datos Firebase" -ForegroundColor Cyan
Write-Host "    npm run restore   # Importar datos a Firebase" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Documentación en-app:" -ForegroundColor White
Write-Host "    http://localhost:3000/dashboard/manual" -ForegroundColor Cyan
Write-Host "    https://ventas-falpat.vercel.app/dashboard/manual" -ForegroundColor Cyan
Write-Host ""

Push-Location $PROJECT_DIR
npm run dev
Pop-Location
