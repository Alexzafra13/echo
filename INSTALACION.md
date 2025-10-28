# Guía de Instalación - Echo Backend

Esta guía te ayuda a instalar y ejecutar el backend de Echo desde cero en un nuevo PC.

## 🚀 Instalación Rápida (Recomendado)

Si tienes Node.js, pnpm y Docker instalados, usa el script automatizado:

```bash
# Instalación completa (Backend + Frontend)
pnpm setup

# Solo backend
pnpm setup:skip-frontend
```

El script verificará requisitos, instalará dependencias, configurará Docker y ejecutará migraciones automáticamente.

**Ver:** [scripts/README.md](./scripts/README.md) para más opciones y troubleshooting.

---

## 📖 Instalación Manual (Paso a Paso)

Si prefieres instalar manualmente o el script falla, sigue estos pasos:

## Requisitos Previos

Antes de empezar, asegúrate de tener instalado:

- **Node.js** 18+ o superior ([nodejs.org](https://nodejs.org))
- **pnpm** 8+ (gestor de paquetes)
  ```bash
  npm install -g pnpm
  ```
- **Docker** y **Docker Compose** ([docker.com](https://www.docker.com/get-started))
- **Git** para clonar el repositorio

## Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
```

## Paso 2: Instalar Dependencias

```bash
pnpm install
```

Esto instalará todas las dependencias del backend (NestJS, Prisma, etc.).

## Paso 3: Configurar Variables de Entorno

Copia el archivo de ejemplo de desarrollo:

```bash
cp .env.development.example .env
```

Abre `.env` y **IMPORTANTE**: cambia el hostname de la base de datos:

```env
NODE_ENV=development
PORT=3000

# Base de datos PostgreSQL
# ⚠️ CAMBIA 'postgres' por 'localhost' si ejecutas desde tu PC (fuera de Docker)
DATABASE_URL=postgresql://music_user:music_password@localhost:5432/music_db?schema=public

# Redis (para caché y colas)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=dev_redis_password

# JWT
JWT_SECRET=dev-jwt-secret-do-not-use-in-production

# Ruta de la biblioteca de música
MUSIC_LIBRARY_PATH=/music
```

**⚠️ IMPORTANTE:**
- Usa `localhost` si ejecutas el backend **desde tu PC** (desarrollo normal)
- Usa `postgres` y `redis` solo si ejecutas el backend **dentro de un contenedor Docker**

## Paso 4: Levantar Servicios con Docker Compose

Para desarrollo local, solo necesitas PostgreSQL y Redis en Docker. **NO** necesitas ejecutar el backend en Docker.

### Opción A: Usando el script de pnpm (Recomendado)

```bash
pnpm docker:up
```

### Opción B: Usando docker-compose directamente

```bash
docker-compose up -d
```

Esto iniciará:
- **PostgreSQL** en `localhost:5432`
- **Redis** en `localhost:6379`

Verifica que los contenedores estén corriendo:

```bash
docker ps
```

Deberías ver `echo-postgres-dev` y `echo-redis-dev` en la lista.

**⚠️ IMPORTANTE:**
- El archivo `docker-compose.yml` solo levanta PostgreSQL y Redis (por defecto)
- Si quieres levantar **toda la app en Docker**, usa `pnpm docker:full`
- Para desarrollo normal, ejecutarás el backend con `pnpm run start:dev` desde tu PC

## Paso 5: Ejecutar Migraciones de Base de Datos

Aplica las migraciones de Prisma para crear las tablas:

```bash
npx prisma migrate dev
```

Esto creará todas las tablas necesarias en PostgreSQL.

## Paso 6: Generar Cliente de Prisma

Genera el cliente de Prisma para TypeScript:

```bash
npx prisma generate
```

## Paso 7: (Opcional) Seed de Base de Datos

Si existe un script de seed para datos iniciales:

```bash
npx prisma db seed
```

**Nota:** Si no existe el seed, puedes crear usuarios y datos manualmente desde la API.

## Paso 8: Iniciar el Servidor de Desarrollo

```bash
pnpm run start:dev
```

El servidor estará disponible en:
- **API**: [http://localhost:3000](http://localhost:3000)
- **Swagger Docs**: [http://localhost:3000/api](http://localhost:3000/api)

## Paso 9: Verificar la Instalación

Abre tu navegador en [http://localhost:3000/api](http://localhost:3000/api) y deberías ver la documentación de Swagger.

También puedes hacer una petición de prueba:

```bash
curl http://localhost:3000
```

## Comandos Útiles

### Backend (NestJS)

```bash
# Desarrollo con hot-reload
pnpm run start:dev

# Modo producción
pnpm run build
pnpm run start:prod

# Tests
pnpm run test          # Unit tests
pnpm run test:e2e      # E2E tests
pnpm run test:cov      # Coverage

# Linting
pnpm run lint
```

### Base de Datos (Prisma)

```bash
# Ver base de datos en navegador
npx prisma studio

# Crear nueva migración
npx prisma migrate dev --name nombre_migracion

# Reset completo de base de datos (¡cuidado!)
npx prisma migrate reset

# Ver estado de migraciones
npx prisma migrate status
```

### Docker

```bash
# Levantar servicios
docker-compose -f docker-compose.dev.yml up -d

# Detener servicios
docker-compose -f docker-compose.dev.yml down

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f

# Reiniciar servicios
docker-compose -f docker-compose.dev.yml restart
```

## Estructura del Proyecto

```
echo/
├── backend/              (código aquí en raíz)
│   ├── src/
│   │   ├── features/     # Módulos por característica
│   │   ├── infrastructure/  # Servicios técnicos
│   │   └── shared/       # Código compartido
│   ├── prisma/
│   │   └── schema.prisma # Esquema de base de datos
│   ├── test/             # Tests E2E
│   └── package.json
│
└── frontend/             # Frontend React
    ├── src/
    └── package.json
```

## Solución de Problemas

### Error: "Port 3000 already in use"

Otro proceso está usando el puerto 3000. Opciones:

1. Detener el proceso: `lsof -ti:3000 | xargs kill -9` (Mac/Linux)
2. Cambiar el puerto en `.env`: `PORT=3001`

### Error: "Can't reach database server at `postgres:5432`"

Este error ocurre por dos razones:

**1. Docker no está corriendo:**

```bash
# Levantar Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Verificar que PostgreSQL está corriendo
docker ps
```

**2. Hostname incorrecto en DATABASE_URL:**

Si ejecutas comandos desde tu PC (como `pnpm db:migrate` o `pnpm start:dev`), necesitas usar `localhost` en vez de `postgres`.

Edita tu archivo `.env` y cambia:

```env
# ❌ NO funciona desde tu PC
DATABASE_URL=postgresql://music_user:music_password@postgres:5432/music_db?schema=public

# ✅ SÍ funciona desde tu PC
DATABASE_URL=postgresql://music_user:music_password@localhost:5432/music_db?schema=public
```

**Regla:**
- `localhost` → Cuando ejecutas código desde tu PC (desarrollo normal)
- `postgres` → Solo cuando ejecutas código dentro de Docker

### Error: "Redis connection refused"

**1. Docker no está corriendo:**

```bash
# Levantar Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Verificar que Redis está corriendo
docker ps
```

**2. Hostname incorrecto:**

Asegúrate de que en `.env` tienes:

```env
REDIS_HOST=localhost  # Si ejecutas desde tu PC
REDIS_PORT=6379
```

### Error al ejecutar migraciones

Si las migraciones fallan, prueba reset completo (⚠️ borra todos los datos):

```bash
npx prisma migrate reset
npx prisma migrate dev
```

## Frontend (Opcional)

Si también quieres ejecutar el frontend:

```bash
cd frontend
pnpm install
pnpm dev
```

El frontend estará en [http://localhost:5173](http://localhost:5173)

## Producción

Para ejecutar en producción, consulta los siguientes archivos:

- `DEPLOYMENT.md` - Guía completa de deployment
- `DOCKER.md` - Uso de Docker
- `.env.production.example` - Variables de entorno para producción

## Resumen Rápido

```bash
# 1. Clonar
git clone https://github.com/Alexzafra13/echo.git
cd echo

# 2. Instalar
pnpm install

# 3. Configurar (verifica que tenga localhost, no postgres)
cp .env.development.example .env

# 4. Docker (solo PostgreSQL y Redis)
pnpm docker:up

# 5. Base de datos
pnpm db:migrate
pnpm db:generate

# 6. Ejecutar backend desde tu PC
pnpm run start:dev
```

**O todo en un solo comando:**

```bash
# Setup completo (después de clonar y configurar .env)
pnpm dev:setup && pnpm run start:dev
```

**Comandos Docker disponibles:**

```bash
pnpm docker:up          # Solo servicios (desarrollo diario)
pnpm docker:down        # Detener servicios
pnpm docker:full        # Stack completo (testing)
pnpm docker:prod        # Producción
```

## Contacto

Si tienes problemas, revisa:
- Issues en GitHub
- Documentación en `/docs`
- Logs en `docker-compose logs -f`

---

**¡Listo!** Ya tienes Echo funcionando localmente. 🎵
