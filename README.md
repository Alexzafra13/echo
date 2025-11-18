# Echo - Music Streaming Platform

Plataforma de streaming de música con NestJS (backend) y React (frontend).

## 🚀 Inicio Rápido

### Requisitos
- Node.js >= 22
- pnpm >= 10
- Docker Desktop (debe estar corriendo)

### Instalación (Primera Vez)

**Opción 1: Instalación automática (recomendado)**
```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
pnpm quickstart
```

**Opción 2: Paso a paso**
```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo

# 1. Instalar dependencias
cd server && pnpm install && cd ..
cd frontend && pnpm install && cd ..

# 2. Levantar base de datos (PostgreSQL + Redis)
pnpm docker:dev

# 3. Generar archivo .env automáticamente (con JWT secrets seguros)
cd server && node scripts/generate-env.js && cd ..

# 4. Ejecutar migraciones y seed
cd server && pnpm db:reset && cd ..

# 5. Iniciar aplicación
pnpm dev:all
```

### Acceso

**Desarrollo (modo local):**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs (Swagger): http://localhost:3000/api/docs

**Producción (Docker):**
- Aplicación completa: http://localhost:4567
- API Docs: http://localhost:4567/api/docs

**Credenciales iniciales:**
- Usuario: `admin`
- Contraseña: `admin123`
- ⚠️ Deberás cambiar la contraseña en el primer login

### Si Ya Tienes el Proyecto

```bash
git pull
pnpm install
pnpm docker:dev
pnpm db:migrate
pnpm dev:all
```

### ⚠️ Si Tienes Problemas (Solución Definitiva)

Si encuentras errores de base de datos, conexión o configuración:

```bash
pnpm reset
```

Este script limpiará TODO (Docker, base de datos, configuración) y volverá a inicializar el proyecto desde cero. Es especialmente útil cuando:
- El backend no se conecta a la base de datos
- Ves errores como "database music_user does not exist"
- El frontend no puede conectarse al backend
- Después de hacer cambios en la configuración de Docker

## 📦 Comandos Principales

```bash
# Desarrollo
pnpm dev              # Solo backend
pnpm dev:all          # Backend + Frontend

# Build
pnpm build            # Frontend + Backend

# Docker (PostgreSQL + Redis)
pnpm docker:dev       # Levantar servicios
pnpm docker:dev:down  # Detener servicios

# Base de Datos
pnpm db:migrate       # Aplicar migraciones
pnpm db:reset         # Reset completo (drop + migrate + seed)
pnpm db:generate      # Generar Prisma Client

# Producción
pnpm docker:build     # Build imagen full-stack
pnpm docker:up        # Deploy
pnpm docker:down      # Detener

# Utilidades
pnpm reset            # Reset COMPLETO (Docker + DB + Config) - Solución definitiva
pnpm clean            # Limpiar builds
```

## 🛠️ Stack

**Backend:** NestJS, Prisma, PostgreSQL, Redis, BullMQ, JWT

**Frontend:** React 18, Vite, Tanstack Query, Zustand

## 🔧 Arquitectura y Configuración de Puertos

### Modo Desarrollo vs Producción

Echo sigue el modelo de **Jellyfin/Plex**: un solo contenedor sirve tanto la UI como la API en producción, pero en desarrollo se ejecutan por separado para facilitar el hot-reload.

| Servicio | Desarrollo | Producción (Docker) |
|----------|-----------|---------------------|
| Frontend | 5173 | 4567 (integrado) |
| Backend API | **3000** | 4567 |
| PostgreSQL | 5432 (expuesto) | 5432 (interno) |
| Redis | 6379 (expuesto) | 6379 (interno) |

### Cómo funciona

**Desarrollo (`pnpm dev:all`):**
- Frontend (Vite) corre en puerto 5173
- Backend (NestJS) corre en puerto 3000
- Vite proxy redirige `/api/*` → `localhost:3000`
- Hot-reload habilitado en ambos

**Producción (`docker-compose up`):**
- Un solo contenedor en puerto 4567
- Sirve frontend estático desde `/frontend/dist`
- Sirve API desde `/api/*`
- Similar a Jellyfin: todo en un solo proceso

### Configuración Automática

Echo genera automáticamente el archivo `.env` con valores seguros:

```bash
cd server
node scripts/generate-env.js
```

Esto crea:
- JWT secrets criptográficamente seguros
- Configuración de base de datos que coincide con `docker-compose.dev.yml`
- Valores por defecto listos para desarrollo

**No necesitas editar archivos `.env` manualmente** a menos que quieras personalizar la configuración.

## 🐛 Problemas Comunes

**Error de conexión frontend → backend:**
```bash
# Verifica que el backend esté en puerto 3000 en desarrollo
curl http://localhost:3000/api/health
```

**Error de migración:**
```bash
cd server
pnpm db:reset
```

**No conecta a la BD:**
```bash
# Verifica que Docker esté corriendo
docker ps | grep echo

# Si no hay contenedores, levántalos:
pnpm docker:dev

# Espera 5 segundos y ejecuta migraciones:
sleep 5
cd server && pnpm db:migrate
```

**La base de datos "music_user" no existe:**
```bash
# Este error indica configuración corrupta. Usa el script de reset:
pnpm reset
```

**Empezar desde cero (recomendado si tienes problemas):**
```bash
pnpm reset
```

### 🪟 Troubleshooting específico de Windows

**Error de red Docker "incorrect label":**
```bash
# El script pnpm reset ahora limpia automáticamente las redes antiguas
# Si aún falla, limpia manualmente:
docker network prune -f
docker volume prune -f
```

**Git Bash vs PowerShell:**
```bash
# Recomendado: usar Git Bash para los scripts
pnpm reset

# En PowerShell, usa los comandos Windows:
pnpm reset:windows  # (si está disponible)
```

**Docker Desktop debe estar corriendo:**
- Abre Docker Desktop antes de ejecutar `pnpm reset`
- Verifica que esté en modo Linux containers (no Windows containers)
- Asegúrate de tener WSL2 instalado y configurado

## 🚢 Despliegue en Producción

Echo es **100% plug-and-play** como Jellyfin.

### Setup (1 comando)

```bash
docker compose up -d
```

**¡Listo!** Sin configuración. Sin archivos .env. Sin scripts.

El servidor automáticamente:
- ✅ Genera JWT secrets criptográficamente seguros
- ✅ Guarda secrets en volumen persistente
- ✅ Detecta primera ejecución
- ✅ Ejecuta migraciones
- ✅ Crea usuario admin (admin/admin123)
- ✅ Muestra credenciales en logs

**Acceso:** http://localhost:4567

**Ver credenciales:**
```bash
docker compose logs echo-app | grep -A 5 "Default Credentials"
```

### 📋 docker-compose.yml Completo (Listo para Copiar)

Crea un archivo `docker-compose.yml` con este contenido y ejecuta `docker compose up -d`:

```yaml
# ============================================
# Echo Music Server - Production (Jellyfin-style)
# ============================================
# 🎵 Self-hosted music streaming platform
#
# Quick Start:
#   docker compose up -d
#
# That's it! No configuration needed.
# - JWT secrets: Auto-generated
# - Database: Auto-initialized
# - Admin user: Created automatically (admin/admin123)
#
# Access: http://localhost:4567
# ============================================

services:
  # ----------------------------------------
  # PostgreSQL Database
  # ----------------------------------------
  postgres:
    image: postgres:16-alpine
    container_name: echo-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-music_admin}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-change_me_in_production}
      POSTGRES_DB: ${POSTGRES_DB:-music_server}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-music_admin} -d ${POSTGRES_DB:-music_server}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - echo-network

  # ----------------------------------------
  # Redis Cache
  # ----------------------------------------
  redis:
    image: redis:7-alpine
    container_name: echo-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-change_me_in_production}
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--pass", "${REDIS_PASSWORD:-change_me_in_production}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - echo-network

  # ----------------------------------------
  # Echo Music Server (Full-stack)
  # ----------------------------------------
  echo-app:
    image: ghcr.io/alexzafra13/echo:latest
    container_name: echo-app
    restart: unless-stopped
    ports:
      - "${APP_PORT:-4567}:4567"
    environment:
      # Application
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 4567
      HOST: 0.0.0.0
      API_PREFIX: api

      # Database
      DATABASE_URL: postgresql://${POSTGRES_USER:-music_admin}:${POSTGRES_PASSWORD:-change_me_in_production}@postgres:5432/${POSTGRES_DB:-music_server}?schema=public

      # Redis
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD:-change_me_in_production}

      # Security (Auto-generated if not provided - Jellyfin-style!)
      JWT_SECRET: ${JWT_SECRET:-}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:-}
      JWT_EXPIRATION: ${JWT_EXPIRATION:-7d}
      JWT_REFRESH_EXPIRATION: ${JWT_REFRESH_EXPIRATION:-30d}
      BCRYPT_ROUNDS: ${BCRYPT_ROUNDS:-12}

      # CORS
      CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:4567}

      # Music Library
      MUSIC_LIBRARY_PATH: /music

      # Cache Configuration
      ENABLE_CACHE: ${ENABLE_CACHE:-true}
      CACHE_ALBUM_TTL: ${CACHE_ALBUM_TTL:-3600}
      CACHE_TRACK_TTL: ${CACHE_TRACK_TTL:-3600}
      CACHE_ARTIST_TTL: ${CACHE_ARTIST_TTL:-7200}

      # File Storage
      UPLOAD_PATH: /app/uploads/music
      COVERS_PATH: /app/uploads/covers

    volumes:
      # Configuration (Jellyfin-style - auto-generated secrets)
      - echo-config:/app/config

      # Music library (mount your music folder here)
      - ${MUSIC_PATH:-./music}:/music:ro

      # Persistent uploads (covers, metadata, etc.)
      - echo-uploads:/app/uploads

      # Application logs
      - echo-logs:/app/logs

    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

    networks:
      - echo-network

    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:4567/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      start_period: 60s
      retries: 3

# ----------------------------------------
# Volumes (Persistent Data)
# ----------------------------------------
volumes:
  postgres-data:
    name: echo-postgres-data
  redis-data:
    name: echo-redis-data
  echo-config:
    name: echo-config
  echo-uploads:
    name: echo-uploads
  echo-logs:
    name: echo-logs

# ----------------------------------------
# Network
# ----------------------------------------
networks:
  echo-network:
    name: echo-network
    driver: bridge
```

**Opcional:** Crea un archivo `.env` solo si quieres personalizar:

```bash
# Ruta a tu biblioteca de música (opcional)
MUSIC_PATH=/mnt/music

# Cambiar contraseñas (recomendado en producción)
POSTGRES_PASSWORD=tu_password_seguro
REDIS_PASSWORD=tu_password_seguro
```

**📖 Guía completa:** [PRODUCTION.md](./PRODUCTION.md)

### Características Jellyfin-style

- **Zero-config**: Sin .env, sin secrets manuales, sin setup
- **Auto-generated secrets**: JWT secrets generados automáticamente
- **Single container**: Frontend + Backend en un proceso (puerto 4567)
- **Auto-setup**: BD, migraciones y admin creados automáticamente
- **Persistent config**: Secrets guardados en `/app/config` (volumen)
- **Clear logs**: Credenciales y URLs mostradas prominentemente

## 📚 Documentación

- **[PRODUCTION.md](./PRODUCTION.md)** - 🚢 Guía de producción completa
- [DOCKER.md](./DOCKER.md) - Deploy avanzado y troubleshooting
- [server/](./server) - Documentación del backend
- [frontend/](./frontend) - Documentación del frontend

## 📄 Licencia

ISC
