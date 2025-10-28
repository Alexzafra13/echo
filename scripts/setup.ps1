# ==============================================
# Echo Monorepo - Script de Instalación Inicial (PowerShell)
# ==============================================
# Compatible con: Windows PowerShell / PowerShell Core
# Uso: .\scripts\setup.ps1 [-SkipDocker] [-SkipFrontend] [-SkipBackend]

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

function Write-ErrorMsg($message) {
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
    Write-Host "Uso: pnpm setup:windows [opciones]"
    Write-Host ""
    Write-Host "Opciones:"
    Write-Host "  -SkipDocker     No levantar Docker"
    Write-Host "  -SkipFrontend   No instalar frontend"
    Write-Host "  -SkipBackend    No instalar backend"
    Write-Host "  -Help           Mostrar esta ayuda"
    exit 0
}

# Start
Write-Header "ECHO MONOREPO - Instalación Inicial"

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

    # Verificar versión mínima (Node >= 22)
    $majorVersion = [int]($nodeVersion -replace 'v(\d+).*', '$1')
    if ($majorVersion -lt 22) {
        Write-Warning "Se requiere Node.js >= 22. Tienes: $nodeVersion"
        $hasError = $true
    }
} else {
    Write-ErrorMsg "Node.js NO está instalado"
    Write-ErrorMsg "Instala Node.js >= 22 desde: https://nodejs.org"
    $hasError = $true
}

# pnpm
if (Test-Command "pnpm") {
    Write-Success "pnpm está instalado"
    $pnpmVersion = pnpm -v
    Write-Info "Versión: $pnpmVersion"
} else {
    Write-ErrorMsg "pnpm NO está instalado"
    Write-ErrorMsg "Instala pnpm con: npm install -g pnpm"
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
        Write-ErrorMsg "Docker NO está instalado"
        Write-ErrorMsg "Instala Docker desde: https://docker.com"
        $hasError = $true
    }
}

if ($hasError) {
    Write-ErrorMsg "Faltan requisitos. Instálalos y vuelve a ejecutar el script."
    exit 1
}

# ==============================================
# 2. Instalar Dependencias del Backend
# ==============================================
if (-not $SkipBackend) {
    Write-Header "2. Instalando Dependencias del Backend"

    if ((Test-Path "server") -and (Test-Path "server\package.json")) {
        Write-Info "Navegando a: server\"
        Push-Location server

        Write-Info "Ejecutando: pnpm install"
        pnpm install

        Pop-Location

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Dependencias del backend instaladas"
        } else {
            Write-ErrorMsg "Error al instalar dependencias"
            exit 1
        }
    } else {
        Write-ErrorMsg "No se encuentra la carpeta server\ o package.json"
        exit 1
    }
} else {
    Write-Info "Skipping backend installation (-SkipBackend)"
}

# ==============================================
# 3. Configurar Variables de Entorno (Backend)
# ==============================================
if (-not $SkipBackend) {
    Write-Header "3. Configurando Variables de Entorno (Backend)"

    Push-Location server

    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.development.example") {
            Write-Info "Copiando .env.development.example a .env"
            Copy-Item ".env.development.example" ".env"
            Write-Success "Archivo .env creado"
            Write-Warning "IMPORTANTE: Revisa el archivo server\.env y ajusta si es necesario"
        } else {
            Write-ErrorMsg "No se encuentra server\.env.development.example"
            Pop-Location
            exit 1
        }
    } else {
        Write-Info "server\.env ya existe, no se sobrescribe"

        # Verificar que tenga localhost
        $envContent = Get-Content ".env" -Raw
        if ($envContent -match "localhost:5432") {
            Write-Success ".env configurado correctamente (usa localhost)"
        } elseif ($envContent -match "postgres:5432") {
            Write-Warning ".env usa 'postgres' como host. Para desarrollo local, cambia a 'localhost'"
            Write-Info "Línea correcta: DATABASE_URL=postgresql://...@localhost:5432/..."
        }
    }

    Pop-Location
}

# ==============================================
# 4. Levantar Docker (PostgreSQL + Redis)
# ==============================================
if ((-not $SkipDocker) -and (-not $SkipBackend)) {
    Write-Header "4. Levantando Servicios Docker"

    Push-Location server

    Write-Info "Ejecutando: docker-compose up -d"

    docker-compose up -d

    Pop-Location

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
            Write-ErrorMsg "PostgreSQL no está corriendo"
            exit 1
        }

        if ($containers -match "echo-redis-dev") {
            Write-Success "Redis está corriendo"
        } else {
            Write-ErrorMsg "Redis no está corriendo"
            exit 1
        }
    } else {
        Write-ErrorMsg "Error al levantar Docker"
        exit 1
    }
} else {
    if ($SkipDocker) {
        Write-Info "Skipping Docker (-SkipDocker)"
    }
}

# ==============================================
# 5. Generar Cliente Prisma
# ==============================================
if (-not $SkipBackend) {
    Write-Header "5. Generando Cliente Prisma"

    Push-Location server

    Write-Info "Ejecutando: pnpm db:generate"
    pnpm db:generate

    Pop-Location

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Cliente Prisma generado"
    } else {
        Write-ErrorMsg "Error al generar cliente Prisma"
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

    Push-Location server

    Write-Info "Ejecutando: pnpm db:migrate"

    # Dar un poco más de tiempo para que PostgreSQL esté 100% listo
    Start-Sleep -Seconds 2

    pnpm db:migrate

    Pop-Location

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Migraciones ejecutadas correctamente"
    } else {
        Write-ErrorMsg "Error al ejecutar migraciones"
        Write-Info "Posible solución: Verifica que Docker esté corriendo y que .env tenga 'localhost'"
        exit 1
    }
} else {
    Write-Info "Skipping migrations"
}

# ==============================================
# 7. Instalar Frontend
# ==============================================
if (-not $SkipFrontend) {
    Write-Header "7. Instalando Dependencias del Frontend"

    if ((Test-Path "frontend") -and (Test-Path "frontend\package.json")) {
        Write-Info "Navegando a: frontend\"
        Push-Location frontend

        Write-Info "Ejecutando: pnpm install"
        pnpm install

        Pop-Location

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Dependencias del frontend instaladas"
        } else {
            Write-ErrorMsg "Error al instalar frontend"
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
Write-Host "  Comandos desde el ROOT:" -ForegroundColor Cyan
Write-Host "    pnpm dev                 # Inicia backend + frontend en paralelo"
Write-Host "    pnpm dev:server          # Solo servidor de desarrollo"
Write-Host "    pnpm dev:frontend        # Solo frontend"
Write-Host "    pnpm build               # Build de todo"
Write-Host "    pnpm test:server         # Tests del backend"
Write-Host ""
Write-Host "  Backend (desde \server):" -ForegroundColor Cyan
Write-Host "    cd server"
Write-Host "    pnpm start:dev           # Servidor en http://localhost:3000"
Write-Host "    pnpm test                # Tests"
Write-Host "    pnpm db:studio           # Prisma Studio"
Write-Host ""

if (-not $SkipFrontend) {
    Write-Host "  Frontend (desde \frontend):" -ForegroundColor Cyan
    Write-Host "    cd frontend"
    Write-Host "    pnpm dev                 # Frontend en http://localhost:5173"
    Write-Host ""
}

Write-Host "  Docker:" -ForegroundColor Cyan
Write-Host "    pnpm docker:up           # Levantar PostgreSQL + Redis"
Write-Host "    pnpm docker:down         # Detener servicios"
Write-Host ""
Write-Host "  Documentación:" -ForegroundColor Cyan
Write-Host "    README.md                # Guía general del monorepo"
Write-Host "    server\DOCKER_COMPOSE_INFO.md  # Guía de Docker"
Write-Host ""

Write-Info "Swagger API: http://localhost:3000/api"

if (-not $SkipFrontend) {
    Write-Info "Frontend: http://localhost:5173"
}

Write-Host ""
Write-Success "¡Happy coding! 🎵"
