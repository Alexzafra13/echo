# Docker Compose Files - Guía de Uso

Este proyecto tiene múltiples archivos `docker-compose` para diferentes propósitos. Esta guía te ayuda a elegir el correcto.

## Archivos Disponibles

### 1. `docker-compose.services.yml` ⭐ **RECOMENDADO para Desarrollo Local**

**Uso:** Desarrollo local en tu PC

**Qué hace:**
- ✅ Levanta **solo PostgreSQL y Redis**
- ❌ NO levanta la aplicación NestJS
- ✅ Expone puertos en `localhost` (5432 para PostgreSQL, 6379 para Redis)

**Cuándo usarlo:**
- Cuando desarrollas en tu PC con tu editor (VS Code, WebStorm, etc.)
- Cuando quieres usar hot-reload con `pnpm run start:dev`
- Cuando quieres debuggear con tu IDE

**Comando:**
```bash
# Usando pnpm script (recomendado)
pnpm docker:services

# O directamente con docker-compose
docker-compose -f docker-compose.services.yml up -d

# Detener
pnpm docker:services:down
# o
docker-compose -f docker-compose.services.yml down
```

**Configuración `.env`:**
```env
DATABASE_URL=postgresql://music_user:music_password@localhost:5432/music_db?schema=public
REDIS_HOST=localhost
```

---

### 2. `docker-compose.dev.yml` - Desarrollo con Todo en Docker

**Uso:** Desarrollo con toda la aplicación en Docker

**Qué hace:**
- ✅ Levanta PostgreSQL, Redis **Y la aplicación NestJS**
- ✅ Todos los servicios dentro de la red de Docker
- ⚠️ Requiere rebuild cuando cambias código

**Cuándo usarlo:**
- Cuando quieres replicar el entorno de producción localmente
- Cuando trabajas en un equipo y todos necesitan el mismo entorno
- Cuando no quieres instalar Node.js/pnpm en tu PC

**Comando:**
```bash
docker-compose -f docker-compose.dev.yml up -d

# Rebuild después de cambios en código
docker-compose -f docker-compose.dev.yml up -d --build

# Detener
docker-compose -f docker-compose.dev.yml down
```

**Configuración `.env`:**
```env
DATABASE_URL=postgresql://music_user:music_password@postgres:5432/music_db?schema=public
REDIS_HOST=redis
```

---

### 3. `docker-compose.prod.yml` - Producción

**Uso:** Despliegue en servidor de producción

**Qué hace:**
- ✅ Configuración optimizada para producción
- ✅ NO expone PostgreSQL/Redis al exterior
- ✅ Solo expone el puerto de la aplicación (4567)
- ✅ Configuración de seguridad y performance

**Cuándo usarlo:**
- Cuando despliegas en un VPS/servidor
- En producción real

**Comando:**
```bash
docker-compose -f docker-compose.prod.yml up -d

# Detener
docker-compose -f docker-compose.prod.yml down
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

---

## Flujo de Trabajo Recomendado

### Para Desarrollo Local (Día a día)

```bash
# 1. Primera vez - Setup
git clone <repo>
cd echo
pnpm install
cp .env.development.example .env
# Editar .env: asegurar que tiene localhost

# 2. Levantar solo servicios
pnpm docker:services

# 3. Migraciones
pnpm db:migrate

# 4. Desarrollo
pnpm run start:dev
```

### Para Testing con Docker Completo

```bash
# Levantar todo en Docker
docker-compose -f docker-compose.dev.yml up -d

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f app

# Rebuild después de cambios
docker-compose -f docker-compose.dev.yml up -d --build
```

### Para Producción

```bash
# En tu servidor
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Comparación Rápida

| Característica | services.yml | dev.yml | prod.yml |
|----------------|--------------|---------|----------|
| PostgreSQL | ✅ | ✅ | ✅ |
| Redis | ✅ | ✅ | ✅ |
| App NestJS | ❌ | ✅ | ✅ |
| Puertos expuestos | DB + Redis | Todos | Solo App |
| Hot reload | ✅ (local) | ❌ | ❌ |
| Velocidad | ⚡ Rápido | 🐢 Lento | ⚡ Rápido |
| Debug fácil | ✅ | ❌ | ❌ |
| Configuración .env | localhost | postgres | postgres |

---

## Scripts de pnpm Disponibles

```bash
# Servicios solo (PostgreSQL + Redis)
pnpm docker:services          # Levantar
pnpm docker:services:down     # Detener

# Setup completo de desarrollo
pnpm dev:setup                # services + migrate

# Docker completo (legacy)
pnpm docker:up                # Levantar todo
pnpm docker:down              # Detener todo
```

---

## Troubleshooting

### Error: "Can't reach database server at postgres:5432"

**Causa:** Estás usando `docker-compose.services.yml` pero tu `.env` tiene `postgres` en vez de `localhost`

**Solución:**
```bash
# Edita .env
DATABASE_URL=postgresql://...@localhost:5432/...
REDIS_HOST=localhost
```

### Error: "dumb-init /app/docker-entrypoint.sh: No such file or directory"

**Causa:** Estás usando `docker-compose.dev.yml` y el build del contenedor tiene problemas

**Solución:**
Usa `docker-compose.services.yml` en su lugar:
```bash
docker-compose -f docker-compose.dev.yml down
pnpm docker:services
pnpm run start:dev
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

---

## Resumen

**Para desarrollo diario:** Usa `docker-compose.services.yml` con `pnpm docker:services`
**Para testing completo:** Usa `docker-compose.dev.yml`
**Para producción:** Usa `docker-compose.prod.yml` o `docker-compose.ghcr.yml`
