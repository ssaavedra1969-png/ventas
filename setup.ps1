<#
.SYNOPSIS
  Configura automáticamente FALPAT Ventas en una PC nueva.
.DESCRIPTION
  - Verifica requisitos (git, Node.js, npm)
  - Clona el repo si no estamos en él
  - Instala dependencias
  - Configura .env.local (pide las credenciales de Firebase)
  - Ofrece iniciar el servidor de desarrollo
#>

$REPO_URL = "https://github.com/ssaavedra1969-png/ventas.git"
$PROJECT_DIR = "ventas"

function Write-Step($msg) {
  Write-Host "`n==> $msg" -ForegroundColor Cyan
}

function Write-Error($msg) {
  Write-Host "ERROR: $msg" -ForegroundColor Red
}

function Write-Success($msg) {
  Write-Host "OK: $msg" -ForegroundColor Green
}

# ─── 1. Verificar requisitos ──────────────────────────────────────────

Write-Step "Verificando requisitos..."

$missing = @()

if (!(Get-Command git -ErrorAction SilentlyContinue)) {
  $missing += "Git (https://git-scm.com/downloads)"
}
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
  $missing += "Node.js (https://nodejs.org/)"
}
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
  $missing += "npm (viene con Node.js)"
}

if ($missing.Count -gt 0) {
  Write-Error "Faltan requisitos:"
  $missing | ForEach-Object { Write-Host "  - $_" }
  Write-Host "Instalá los programas faltantes y ejecutá de nuevo este script." -ForegroundColor Yellow
  pause
  exit 1
}

Write-Success "Git $((git --version).Split()[2])"
Write-Success "Node.js $((node --version).TrimStart('v'))"
Write-Success "npm $((npm --version))"

# ─── 2. Obtener el código ────────────────────────────────────────────

Write-Step "Obteniendo el proyecto..."

if (Test-Path "$PSScriptRoot\package.json") {
  # Ya estamos dentro del repo
  $projectPath = $PSScriptRoot
  Write-Success "Ya estamos en el proyecto: $projectPath"
} elseif (Test-Path "$PWD\$PROJECT_DIR\package.json") {
  $projectPath = "$PWD\$PROJECT_DIR"
  Write-Success "Proyecto encontrado en: $projectPath"
} else {
  Write-Host "Clonando repositorio..."
  git clone $REPO_URL
  if ($LASTEXITCODE -ne 0) {
    Write-Error "No se pudo clonar el repositorio."
    pause
    exit 1
  }
  $projectPath = "$PWD\$PROJECT_DIR"
  Write-Success "Clonado en: $projectPath"
}

Set-Location $projectPath

# ─── 3. Instalar dependencias ─────────────────────────────────────────

Write-Step "Instalando dependencias (npm install)..."
npm install
if ($LASTEXITCODE -ne 0) {
  Write-Error "npm install falló."
  pause
  exit 1
}
Write-Success "Dependencias instaladas."

# ─── 4. Configurar .env.local ─────────────────────────────────────────

Write-Step "Configurando Firebase..."

$envFile = "$projectPath\.env.local"
$exampleFile = "$projectPath\.env.example"

if (Test-Path $envFile) {
  Write-Host "Ya existe .env.local. Usando configuración existente." -ForegroundColor Yellow
} else {
  Write-Host "Necesitás las credenciales de Firebase." -ForegroundColor Yellow
  Write-Host "Obtenelas de: https://console.firebase.google.com/project/leafy-valor-410916/settings/general" -ForegroundColor Yellow
  Write-Host " (o del .env.local de la otra PC)`n" -ForegroundColor Yellow

  $apiKey = Read-Host "NEXT_PUBLIC_FIREBASE_API_KEY"
  $authDomain = Read-Host "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  $projectId = Read-Host "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  $storageBucket = Read-Host "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  $senderId = Read-Host "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  $appId = Read-Host "NEXT_PUBLIC_FIREBASE_APP_ID"

  @"
NEXT_PUBLIC_FIREBASE_API_KEY=$apiKey
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$authDomain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$projectId
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$storageBucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$senderId
NEXT_PUBLIC_FIREBASE_APP_ID=$appId
"@ | Out-File -FilePath $envFile -Encoding utf8

  Write-Success ".env.local creado."
}

# ─── 5. Build de prueba ────────────────────────────────────────────────

Write-Step "Verificando que compile..."
npm run build
if ($LASTEXITCODE -eq 0) {
  Write-Success "Build exitoso."
} else {
  Write-Error "El build falló. Revisá los errores arriba."
  pause
  exit 1
}

# ─── 6. Ofrecer iniciar ───────────────────────────────────────────────

Write-Step "¡Listo! El proyecto está configurado."

$choice = Read-Host "¿Querés iniciar el servidor de desarrollo ahora? (s/N)"
if ($choice -eq "s" -or $choice -eq "S") {
  Write-Host "Iniciando servidor en http://localhost:3000 ...`n" -ForegroundColor Green
  npm run dev
}

Write-Host "`nComandos útiles:" -ForegroundColor Cyan
Write-Host "  npm run dev      - Iniciar servidor de desarrollo"
Write-Host "  npm run build    - Compilar para producción"
Write-Host "  npm run start    - Iniciar servidor de producción"
Write-Host ""

pause
