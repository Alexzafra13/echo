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
