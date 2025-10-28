# ==============================================
# Echo - Script de Instalación Inicial (PowerShell)
# ==============================================
# Compatible con: Windows PowerShell / PowerShell Core
# Uso: .\scripts\setup.ps1 [-SkipDocker] [-SkipFrontend]

param(
    [switch]$SkipDocker,
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$Help
)

# Colores
function Write-Header($message) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Blue
    Write-Host "  $message" -ForegroundColor Blue
    Write-Host "==================================================" -ForegroundColor Blue
    Write-Host ""
}

function Write-Success($message) {
    Write-Host "✓ $message" -ForegroundColor Green
}

function Write-Error($message) {
    Write-Host "✗ $message" -ForegroundColor Red
}

function Write-Warning($message) {
    Write-Host "⚠ $message" -ForegroundColor Yellow
}

function Write-Info($message) {
    Write-Host "ℹ $message" -ForegroundColor Cyan
}

function Test-Command($command) {
    $exists = $null -ne (Get-Command $command -ErrorAction SilentlyContinue)
    return $exists
}

# Show help
if ($Help) {
    Write-Host "Uso: .\scripts\setup.ps1 [opciones]"
    Write-Host ""
    Write-Host "Opciones:"
    Write-Host "  -SkipDocker     No levantar Docker"
    Write-Host "  -SkipFrontend   No instalar frontend"
    Write-Host "  -SkipBackend    No instalar backend"
    Write-Host "  -Help           Mostrar esta ayuda"
    exit 0
}

# Start
Write-Header "ECHO - Instalación Inicial"

# ==============================================
# 1. Verificar Requisitos
# ==============================================
Write-Header "1. Verificando Requisitos"

$hasError = $false

# Node.js
if (Test-Command "node") {
    Write-Success "Node.js está instalado"
    $nodeVersion = node -v
    Write-Info "Versión: $nodeVersion"
} else {
    Write-Error "Node.js NO está instalado"
    Write-Error "Instala Node.js >= 18 desde: https://nodejs.org"
    $hasError = $true
}

# pnpm
if (Test-Command "pnpm") {
    Write-Success "pnpm está instalado"
    $pnpmVersion = pnpm -v
    Write-Info "Versión: $pnpmVersion"
} else {
    Write-Error "pnpm NO está instalado"
    Write-Error "Instala pnpm con: npm install -g pnpm"
    $hasError = $true
}

# Docker (solo si no se skipea)
if (-not $SkipDocker) {
    if (Test-Command "docker") {
        Write-Success "Docker está instalado"
        $dockerVersion = docker --version
        Write-Info "Versión: $dockerVersion"

        # Verificar que Docker esté corriendo
        try {
            docker ps | Out-Null
            Write-Success "Docker está corriendo"
        } catch {
            Write-Warning "Docker NO está corriendo. Inícialo antes de continuar."
            $hasError = $true
        }
    } else {
        Write-Error "Docker NO está instalado"
        Write-Error "Instala Docker desde: https://docker.com"
        $hasError = $true
    }
}

if ($hasError) {
    Write-Error "Faltan requisitos. Instálalos y vuelve a ejecutar el script."
    exit 1
}

# ==============================================
# 2. Instalar Dependencias del Backend
# ==============================================
if (-not $SkipBackend) {
    Write-Header "2. Instalando Dependencias del Backend"

    if (Test-Path "package.json") {
        Write-Info "Ejecutando: pnpm install"
        pnpm install
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Dependencias del backend instaladas"
        } else {
            Write-Error "Error al instalar dependencias"
            exit 1
        }
    } else {
        Write-Error "No se encuentra package.json en la raíz"
        exit 1
    }
} else {
    Write-Info "Skipping backend installation (-SkipBackend)"
}

# ==============================================
# 3. Configurar Variables de Entorno
# ==============================================
Write-Header "3. Configurando Variables de Entorno"

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.development.example") {
        Write-Info "Copiando .env.development.example a .env"
        Copy-Item ".env.development.example" ".env"
        Write-Success "Archivo .env creado"
        Write-Warning "IMPORTANTE: Revisa el archivo .env y ajusta si es necesario"
        Write-Info "Debe tener: DATABASE_URL con 'localhost' (no 'postgres')"
    } else {
        Write-Error "No se encuentra .env.development.example"
        exit 1
    }
} else {
    Write-Info ".env ya existe, no se sobrescribe"

    # Verificar que tenga localhost
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "localhost:5432") {
        Write-Success ".env configurado correctamente (usa localhost)"
    } elseif ($envContent -match "postgres:5432") {
        Write-Warning ".env usa 'postgres' como host. Para desarrollo local, cambia a 'localhost'"
        Write-Info "Línea correcta: DATABASE_URL=postgresql://...@localhost:5432/..."
    }
}

# ==============================================
# 4. Levantar Docker (PostgreSQL + Redis)
# ==============================================
if (-not $SkipDocker) {
    Write-Header "4. Levantando Servicios Docker"

    Write-Info "Ejecutando: docker-compose up -d"

    docker-compose up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Servicios Docker levantados"

        # Esperar a que PostgreSQL esté listo
        Write-Info "Esperando a que PostgreSQL esté listo..."
        Start-Sleep -Seconds 5

        # Verificar que los contenedores estén corriendo
        $containers = docker ps --format "{{.Names}}"

        if ($containers -match "echo-postgres-dev") {
            Write-Success "PostgreSQL está corriendo"
        } else {
            Write-Error "PostgreSQL no está corriendo"
            exit 1
        }

        if ($containers -match "echo-redis-dev") {
            Write-Success "Redis está corriendo"
        } else {
            Write-Error "Redis no está corriendo"
            exit 1
        }
    } else {
        Write-Error "Error al levantar Docker"
        exit 1
    }
} else {
    Write-Info "Skipping Docker (-SkipDocker)"
}

# ==============================================
# 5. Generar Cliente Prisma
# ==============================================
if (-not $SkipBackend) {
    Write-Header "5. Generando Cliente Prisma"

    Write-Info "Ejecutando: pnpm db:generate"
    pnpm db:generate
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Cliente Prisma generado"
    } else {
        Write-Error "Error al generar cliente Prisma"
        exit 1
    }
} else {
    Write-Info "Skipping Prisma generation (-SkipBackend)"
}

# ==============================================
# 6. Ejecutar Migraciones
# ==============================================
if ((-not $SkipBackend) -and (-not $SkipDocker)) {
    Write-Header "6. Ejecutando Migraciones de Base de Datos"

    Write-Info "Ejecutando: pnpm db:migrate"

    # Dar un poco más de tiempo para que PostgreSQL esté 100% listo
    Start-Sleep -Seconds 2

    pnpm db:migrate
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Migraciones ejecutadas correctamente"
    } else {
        Write-Error "Error al ejecutar migraciones"
        Write-Info "Posible solución: Verifica que Docker esté corriendo y que .env tenga 'localhost'"
        exit 1
    }
} else {
    Write-Info "Skipping migrations"
}

# ==============================================
# 7. Instalar Frontend (Opcional)
# ==============================================
if (-not $SkipFrontend) {
    Write-Header "7. Instalando Dependencias del Frontend"

    if ((Test-Path "frontend") -and (Test-Path "frontend\package.json")) {
        Write-Info "Ejecutando: cd frontend && pnpm install"
        Push-Location frontend
        pnpm install
        Pop-Location

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Dependencias del frontend instaladas"
        } else {
            Write-Error "Error al instalar frontend"
        }
    } else {
        Write-Warning "No se encuentra la carpeta frontend\ o package.json"
    }
} else {
    Write-Info "Skipping frontend installation (-SkipFrontend)"
}

# ==============================================
# Finalización
# ==============================================
Write-Header "✓ Instalación Completada"

Write-Host ""
Write-Host "¡Todo listo! Ahora puedes:" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend:" -ForegroundColor Cyan
Write-Host "    pnpm start:dev        # Iniciar servidor de desarrollo"
Write-Host "    pnpm test            # Ejecutar tests"
Write-Host "    pnpm db:studio       # Abrir Prisma Studio"
Write-Host ""

if (-not $SkipFrontend) {
    Write-Host "  Frontend:" -ForegroundColor Cyan
    Write-Host "    cd frontend"
    Write-Host "    pnpm dev             # Iniciar frontend en http://localhost:5173"
    Write-Host ""
}

Write-Host "  Documentación:" -ForegroundColor Cyan
Write-Host "    README.md            # Guía general"
Write-Host "    INSTALACION.md       # Guía de instalación detallada"
Write-Host "    DOCKER_COMPOSE_INFO.md  # Guía de Docker"
Write-Host ""

Write-Info "Swagger API: http://localhost:3000/api"

if (-not $SkipFrontend) {
    Write-Info "Frontend: http://localhost:5173"
}

Write-Host ""
Write-Success "¡Happy coding! 🎵"
