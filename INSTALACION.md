# Guía de Instalación - Echo Backend

Esta guía te ayuda a instalar y ejecutar el backend de Echo desde cero en un nuevo PC.

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

Abre `.env` y revisa/ajusta las siguientes variables si es necesario:

```env
NODE_ENV=development
PORT=3000

# Base de datos PostgreSQL
DATABASE_URL=postgresql://music_user:music_password@postgres:5432/music_db?schema=public

# Redis (para caché y colas)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=dev_redis_password

# JWT
JWT_SECRET=dev-jwt-secret-do-not-use-in-production

# Ruta de la biblioteca de música
MUSIC_LIBRARY_PATH=/music
```

**Nota:** Para desarrollo local, estos valores por defecto funcionan bien con Docker Compose.

## Paso 4: Levantar Servicios con Docker Compose

El proyecto incluye PostgreSQL y Redis en Docker Compose:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Esto iniciará:
- **PostgreSQL** en `localhost:5432`
- **Redis** en `localhost:6379`

Verifica que los contenedores estén corriendo:

```bash
docker ps
```

Deberías ver `postgres` y `redis` en la lista.

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

### Error: "Can't reach database server"

PostgreSQL no está corriendo. Ejecuta:

```bash
docker-compose -f docker-compose.dev.yml up -d postgres
```

### Error: "Redis connection refused"

Redis no está corriendo. Ejecuta:

```bash
docker-compose -f docker-compose.dev.yml up -d redis
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

# 3. Configurar
cp .env.development.example .env

# 4. Docker
docker-compose -f docker-compose.dev.yml up -d

# 5. Base de datos
npx prisma migrate dev
npx prisma generate

# 6. Ejecutar
pnpm run start:dev
```

## Contacto

Si tienes problemas, revisa:
- Issues en GitHub
- Documentación en `/docs`
- Logs en `docker-compose logs -f`

---

**¡Listo!** Ya tienes Echo funcionando localmente. 🎵
