# Docker Compose Files - Guía de Uso

Este proyecto tiene múltiples archivos `docker-compose` para diferentes propósitos. Esta guía te ayuda a elegir el correcto.

## Archivos Disponibles

### 1. `docker-compose.yml` ⭐ **RECOMENDADO para Desarrollo Local**

**Uso:** Desarrollo local diario en tu PC

**Qué hace:**
- ✅ Levanta **solo PostgreSQL y Redis**
- ❌ NO levanta la aplicación NestJS
- ✅ Expone puertos en `localhost` (5432 para PostgreSQL, 6379 para Redis)

**Cuándo usarlo:**
- ✅ Desarrollo diario con tu editor (VS Code, WebStorm, etc.)
- ✅ Cuando quieres hot-reload con `pnpm run start:dev`
- ✅ Cuando quieres debuggear con tu IDE
- ✅ Es el archivo **por defecto** - no necesitas especificar `-f`

**Comando:**
```bash
# Usando docker-compose directamente (usa docker-compose.yml por defecto)
docker-compose up -d

# O con pnpm scripts (recomendado)
pnpm docker:up

# Detener
docker-compose down
# o
pnpm docker:down
```

**Configuración `.env`:**
```env
DATABASE_URL=postgresql://music_user:music_password@localhost:5432/music_db?schema=public
REDIS_HOST=localhost
```

---

### 2. `docker-compose.full.yml` - Stack Completo en Docker

**Uso:** Testing con toda la aplicación en Docker

**Qué hace:**
- ✅ Levanta PostgreSQL, Redis **Y la aplicación NestJS**
- ✅ Todos los servicios dentro de la red de Docker
- ⚠️ Requiere rebuild cuando cambias código

**Cuándo usarlo:**
- Cuando quieres replicar el entorno de producción localmente
- Para CI/CD o testing automatizado
- Cuando trabajas en un equipo y todos necesitan el mismo entorno
- Cuando no quieres instalar Node.js/pnpm en tu PC

**Comando:**
```bash
# Levantar stack completo
pnpm docker:full

# Ver logs de la aplicación
pnpm docker:full:logs

# Rebuild después de cambios en código
docker-compose -f docker-compose.full.yml up -d --build

# Detener
pnpm docker:full:down
```

**Configuración (variables se pasan en el archivo):**
- Usa hostnames internos de Docker (`postgres`, `redis`)
- No necesitas `.env` porque las variables están en el archivo

---

### 3. `docker-compose.prod.yml` - Producción

**Uso:** Despliegue en servidor de producción

**Qué hace:**
- ✅ Configuración optimizada para producción
- ✅ NO expone PostgreSQL/Redis al exterior (seguridad)
- ✅ Solo expone el puerto de la aplicación (4567)
- ✅ Configuración de seguridad y performance

**Cuándo usarlo:**
- Cuando despliegas en un VPS/servidor
- En producción real

**Comando:**
```bash
# Con pnpm script
pnpm docker:prod

# O directamente
docker-compose -f docker-compose.prod.yml up -d

# Detener
pnpm docker:prod:down
```

---

### 4. `docker-compose.ghcr.yml` - Producción con GitHub Container Registry

**Uso:** Despliegue usando imagen pre-construida de GHCR

**Qué hace:**
- ✅ Usa imagen de `ghcr.io/alexzafra13/echo`
- ✅ NO requiere código fuente en el servidor
- ✅ Más rápido (no necesita build)

**Cuándo usarlo:**
- Cuando has publicado la imagen en GitHub Container Registry
- En servidores de producción sin código fuente
- Para deployments rápidos

---

## Flujo de Trabajo Recomendado

### Para Desarrollo Local (Día a día) ⭐

```bash
# 1. Primera vez - Setup
git clone <repo>
cd echo
pnpm install
cp .env.development.example .env
# Editar .env: asegurar que tiene localhost

# 2. Levantar solo servicios (PostgreSQL + Redis)
pnpm docker:up
# o simplemente:
docker-compose up -d

# 3. Migraciones
pnpm db:migrate

# 4. Desarrollo (ejecutar desde tu PC)
pnpm run start:dev
```

### Para Testing con Docker Completo

```bash
# Levantar todo en Docker (PostgreSQL + Redis + App)
pnpm docker:full

# Ver logs
pnpm docker:full:logs

# Rebuild después de cambios
docker-compose -f docker-compose.full.yml up -d --build

# Detener
pnpm docker:full:down
```

### Para Producción

```bash
# En tu servidor
git pull
pnpm docker:prod

# O con imagen de GHCR
docker-compose -f docker-compose.ghcr.yml up -d
```

---

## Comparación Rápida

| Característica | docker-compose.yml | docker-compose.full.yml | docker-compose.prod.yml |
|----------------|--------------------|-----------------------|------------------------|
| **Archivo por defecto** | ✅ Sí | ❌ No | ❌ No |
| **PostgreSQL** | ✅ | ✅ | ✅ |
| **Redis** | ✅ | ✅ | ✅ |
| **App NestJS** | ❌ | ✅ | ✅ |
| **Puertos expuestos** | DB + Redis | Todos | Solo App |
| **Hot reload** | ✅ (local) | ❌ | ❌ |
| **Velocidad** | ⚡ Rápido | 🐢 Lento | ⚡ Rápido |
| **Debug fácil** | ✅ | ❌ | ❌ |
| **Config .env** | localhost | postgres | postgres |
| **Uso típico** | Desarrollo diario | Testing/CI | Producción |

---

## Scripts de pnpm Disponibles

```bash
# Desarrollo Local (servicios solo - PostgreSQL + Redis)
pnpm docker:up              # Levantar
pnpm docker:down            # Detener

# Stack Completo (PostgreSQL + Redis + App)
pnpm docker:full            # Levantar
pnpm docker:full:down       # Detener
pnpm docker:full:logs       # Ver logs

# Producción
pnpm docker:prod            # Levantar
pnpm docker:prod:down       # Detener

# Setup completo de desarrollo
pnpm dev:setup              # docker:up + migrate
```

---

## Troubleshooting

### Error: "Can't reach database server at postgres:5432"

**Causa:** Estás usando `docker-compose.yml` (servicios solo) pero tu `.env` tiene `postgres` en vez de `localhost`

**Solución:**
```bash
# Edita .env
DATABASE_URL=postgresql://...@localhost:5432/...
REDIS_HOST=localhost
```

### Error: "dumb-init /app/docker-entrypoint.sh: No such file or directory"

**Causa:** Estás usando `docker-compose.full.yml` y el build del contenedor tiene problemas

**Solución 1 - Usar servicios solo (recomendado):**
```bash
docker-compose -f docker-compose.full.yml down
pnpm docker:up
pnpm run start:dev
```

**Solución 2 - Rebuild el contenedor:**
```bash
docker-compose -f docker-compose.full.yml up -d --build
```

### Error: "Port 3000 already in use"

**Causa:** Ya tienes otro proceso en el puerto 3000

**Solución:**
```bash
# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Linux/Mac
lsof -ti:3000 | xargs kill -9

# O cambia el puerto en .env
PORT=3001
```

### Ya tengo contenedores corriendo con los nombres antiguos

**Solución:**
```bash
# Detener todos los contenedores
docker-compose -f docker-compose.full.yml down

# Levantar con la nueva configuración
pnpm docker:up
```

---

## Migración desde Versión Anterior

Si ya tenías el proyecto con los archivos antiguos:

```bash
# Los archivos fueron renombrados:
docker-compose.services.yml  →  docker-compose.yml
docker-compose.dev.yml       →  docker-compose.full.yml

# Los scripts cambiaron:
pnpm docker:services         →  pnpm docker:up
pnpm docker:services:down    →  pnpm docker:down
# (antiguo docker:up)         →  pnpm docker:full
```

**Para migrar:**
```bash
# 1. Pull del repo actualizado
git pull

# 2. Detener contenedores antiguos
docker-compose -f docker-compose.services.yml down 2>/dev/null || true
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

# 3. Levantar con nueva configuración
pnpm docker:up
```

---

## Resumen

**Para desarrollo diario:**
```bash
pnpm docker:up          # Solo PostgreSQL + Redis
pnpm run start:dev      # Backend en tu PC
```

**Para testing completo:**
```bash
pnpm docker:full        # Todo en Docker
```

**Para producción:**
```bash
pnpm docker:prod        # Producción optimizada
```

**Comando más simple (usa archivo por defecto):**
```bash
docker-compose up -d    # = pnpm docker:up
```
