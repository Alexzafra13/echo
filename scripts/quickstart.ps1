# ==============================================
# Echo Monorepo - Script de Quickstart Completo (Windows)
# ==============================================
# Instala TODO y levanta el proyecto completo
# Uso: powershell -ExecutionPolicy Bypass -File scripts/quickstart.ps1

$ErrorActionPreference = "Stop"

# Colores
function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Blue
    Write-Host "  $Message" -ForegroundColor Blue
    Write-Host "==================================================" -ForegroundColor Blue
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Blue
}

# ==============================================
# 1. Ejecutar Setup Completo
# ==============================================
Write-Header "ECHO QUICKSTART - Instalación y Arranque Completo"

Write-Info "Ejecutando instalación completa..."
Write-Host ""

# Ejecutar el script de setup
if (Test-Path "scripts/setup.ps1") {
    & powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error en la instalación"
        exit 1
    }
} else {
    Write-Error "No se encuentra scripts/setup.ps1"
    exit 1
}

Write-Host ""

# ==============================================
# 2. Verificar que todo está instalado
# ==============================================
Write-Header "Verificando instalación"

# Verificar que Docker esté corriendo
$postgresRunning = docker ps | Select-String "echo-postgres-dev"
if ($postgresRunning) {
    Write-Success "PostgreSQL está corriendo"
} else {
    Write-Error "PostgreSQL no está corriendo. Ejecuta: pnpm docker:dev"
    exit 1
}

$redisRunning = docker ps | Select-String "echo-redis-dev"
if ($redisRunning) {
    Write-Success "Redis está corriendo"
} else {
    Write-Error "Redis no está corriendo. Ejecuta: pnpm docker:dev"
    exit 1
}

# Verificar que las dependencias estén instaladas
if (Test-Path "server/node_modules") {
    Write-Success "Dependencias del backend instaladas"
} else {
    Write-Error "Dependencias del backend no instaladas"
    exit 1
}

if (Test-Path "frontend/node_modules") {
    Write-Success "Dependencias del frontend instaladas"
} else {
    Write-Error "Dependencias del frontend no instaladas"
    exit 1
}

Write-Host ""

# ==============================================
# 3. Levantar Aplicación Completa
# ==============================================
Write-Header "Levantando aplicación completa"

Write-Info "Iniciando backend y frontend en paralelo..."
Write-Info "Backend: http://localhost:4567"
Write-Info "Frontend: http://localhost:5173"
Write-Host ""
Write-Info "Presiona Ctrl+C para detener ambos servicios"
Write-Host ""

# Dar un segundo para que se vea el mensaje
Start-Sleep -Seconds 2

# Ejecutar dev:all (backend + frontend en paralelo)
pnpm dev:all
