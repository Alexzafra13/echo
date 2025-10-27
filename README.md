# Echo Server Backend

Music streaming server con arquitectura hexagonal construido con NestJS, Prisma y PostgreSQL.

## Características

- **Arquitectura Hexagonal** (Ports & Adapters)
- **Scanner de música** automático con caché Redis
- **Autenticación JWT** con roles (user/admin)
- **Sistema de álbumes, artistas y canciones**
- **Tests unitarios y E2E** con 4 BDs paralelas
- **Docker multi-stage** optimizado para producción

## Requisitos Previos

- Node.js >= 22.17.0
- pnpm >= 10.0.0
- Docker y Docker Compose

## Setup Rápido (Docker)

### Desarrollo
```bash
# 1. Copiar variables de entorno
cp .env.development.example .env

# 2. Levantar todo (PostgreSQL + Redis + App)
docker compose -f docker-compose.dev.yml up

# Servidor: http://localhost:3000/api
```

### Producción
```bash
# 1. Configurar variables
cp .env.production.example .env
# Editar .env con tus valores seguros

# 2. Levantar en producción
docker compose -f docker-compose.prod.yml up -d

# Servidor: http://<SERVER_IP>:4567/api
```

### Imagen Pre-construida (GHCR)
```bash
# Usar imagen desde GitHub Container Registry
docker compose -f docker-compose.ghcr.yml up -d
```

## Setup Local (sin Docker)

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar solo PostgreSQL + Redis
docker compose -f docker-compose.dev.yml up postgres redis -d

# 3. Generar Prisma
pnpm db:generate

# 4. Ejecutar migraciones
pnpm db:migrate

# 5. Iniciar desarrollo
pnpm start:dev
```

El servidor estará disponible en `http://localhost:3000/api`

## Scripts Disponibles

### Desarrollo
- `pnpm start:dev` - Inicia servidor en modo desarrollo
- `pnpm build` - Compila el proyecto

### Base de Datos
- `pnpm db:migrate` - Ejecuta migraciones en BD principal
- `pnpm db:generate` - Genera cliente Prisma
- `pnpm db:studio` - Abre Prisma Studio
- `pnpm db:seed` - Ejecuta seed de datos
- `pnpm test:migrate` - Migra las 4 BDs de testing

### Testing
- `pnpm test` - Ejecuta todos los tests
- `pnpm test:watch` - Ejecuta tests en modo watch
- `pnpm test:cov` - Ejecuta tests con coverage

### Docker
- `pnpm docker:up` - Levanta contenedores (PostgreSQL + Redis)
- `pnpm docker:down` - Detiene contenedores
- `pnpm docker:setup` - Setup completo (up + migraciones)
- `docker compose -f docker-compose.dev.yml up` - Dev completo (puerto 3000)
- `docker compose -f docker-compose.prod.yml up` - Prod completo (puerto 4567)
- `docker compose -f docker-compose.ghcr.yml up` - Imagen pre-construida

## Arquitectura

```
src/
├── features/              # Módulos por característica
│   ├── auth/             # Autenticación JWT + roles
│   ├── users/            # Gestión de usuarios
│   ├── admin/            # Panel admin
│   ├── albums/           # Álbumes
│   ├── artists/          # Artistas
│   ├── songs/            # Canciones
│   └── scanner/          # Scanner de archivos de música
│       ├── domain/              # Lógica de negocio
│       │   ├── entities/
│       │   ├── ports/           # Interfaces
│       │   └── use-cases/       # Casos de uso
│       ├── infrastructure/      # Adaptadores externos
│       │   ├── persistence/
│       │   └── cache/           # Caché Redis con decoradores
│       └── presentation/        # Capa HTTP
│           ├── controller/
│           └── dtos/
├── infrastructure/        # Servicios compartidos (Redis, etc)
├── shared/               # Guards, decorators, utils
└── config/               # Configuración de app
```

**Arquitectura Hexagonal**: Domain (negocio) → Infrastructure (adaptadores) → Presentation (HTTP)

## Testing

El proyecto usa **4 bases de datos paralelas** para ejecutar tests en paralelo con Jest workers:
- `music_server_test_1`
- `music_server_test_2`
- `music_server_test_3`
- `music_server_test_4`

### Tipos de Tests
- **Unitarios**: `*.spec.ts` en cada use-case
- **Integración**: `test/e2e/*.e2e-spec.ts`

### Ejecutar Tests Específicos
```bash
# Solo tests de auth
pnpm test -- auth

# Solo tests E2E
pnpm test -- test/e2e

# Un archivo específico
pnpm test -- src/features/users/domain/use-cases/change-password/change-password.use-case.spec.ts
```

## Variables de Entorno

Usa los archivos `.env*.example` como plantillas:

- `.env.development.example` → Desarrollo (puerto 3000, localhost)
- `.env.production.example` → Producción (puerto 4567, 0.0.0.0)

```env
NODE_ENV=production
PORT=4567
HOST=0.0.0.0
DATABASE_URL=postgresql://user:pass@postgres:5432/music_server
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-super-secret-key
JWT_EXPIRATION=24h
```

**Importante**: En producción, cambia todas las contraseñas y secrets.

## Flujo de Trabajo Típico

### Desarrollo de nueva feature
```bash
# 1. Levantar infraestructura
pnpm docker:up

# 2. Modo desarrollo
pnpm start:dev

# 3. Ejecutar tests
pnpm test:watch
```

### Agregar nueva migración
```bash
# 1. Modificar prisma/schema.prisma

# 2. Crear migración
pnpm db:migrate

# 3. Migrar BDs de testing
pnpm test:migrate

# 4. Ejecutar tests
pnpm test
```

### Resetear entorno
```bash
# Detener contenedores
pnpm docker:down

# Limpiar y reiniciar
pnpm docker:setup
```

## Tecnologías

- **NestJS** - Framework backend
- **Prisma** - ORM con auto-migraciones
- **PostgreSQL** - Base de datos
- **Redis** - Caché (Scanner, metadatos)
- **JWT** - Autenticación
- **Jest** - Testing (4 BDs paralelas)
- **TypeScript** - Lenguaje
- **Docker** - Multi-stage build optimizado
- **GitHub Actions** - CI/CD con GHCR

## Documentación Adicional

- `DEPLOYMENT.md` - Guía de despliegue completa
- `ENVIRONMENTS.md` - Configuración dev/prod
- `DOCKER_REGISTRY.md` - Uso de GitHub Container Registry
- `DOCKER.md` - Guía Docker detallada
