# Echo Server Backend

Music streaming server con arquitectura hexagonal construido con NestJS, Prisma y PostgreSQL.

## Requisitos Previos

- Node.js >= 22.17.0
- pnpm >= 10.0.0
- Docker y Docker Compose

## Setup Inicial

### 1. Instalar dependencias
```bash
pnpm install
```

### 2. Levantar servicios (PostgreSQL + Redis)
```bash
pnpm docker:up
```

### 3. Generar cliente Prisma
```bash
pnpm db:generate
```

### 4. Ejecutar migraciones
```bash
# BD principal
pnpm db:migrate

# BDs de testing (4 bases paralelas para Jest)
pnpm test:migrate
```

### 5. (Opcional) Seed de datos
```bash
pnpm db:seed
```

## Ejecutar el proyecto

```bash
# Desarrollo con hot-reload
pnpm start:dev

# Producción
pnpm build
pnpm start:prod
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

## Arquitectura

```
src/
├── features/              # Módulos por característica (Hexagonal Architecture)
│   ├── auth/
│   ├── users/
│   ├── admin/
│   └── albums/
│       ├── domain/              # Lógica de negocio
│       │   ├── entities/
│       │   ├── ports/           # Interfaces
│       │   └── use-cases/       # Casos de uso
│       ├── infrastructure/      # Adaptadores externos
│       │   └── persistence/
│       └── presentation/        # Capa HTTP
│           ├── controller/
│           └── dtos/
├── infrastructure/        # Servicios compartidos
├── shared/               # Guards, decorators, utils
└── config/               # Configuración de app
```

### Capas de la Arquitectura Hexagonal

**Domain** → Lógica de negocio pura, sin dependencias externas
**Infrastructure** → Adaptadores (BD, APIs externas, servicios)
**Presentation** → Controllers, DTOs, validación HTTP

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

Configuradas en `.env` (desarrollo) y `.env.test` (testing):

```env
DATABASE_URL="postgresql://music_admin:music_password@localhost:5432/music_server"
JWT_SECRET="your-secret-key"
JWT_EXPIRATION="24h"
REDIS_HOST="localhost"
REDIS_PORT=6379
NODE_ENV="development"
PORT=3000
```

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
- **Prisma** - ORM
- **PostgreSQL** - Base de datos
- **Redis** - Caché y colas
- **JWT** - Autenticación
- **Jest** - Testing
- **TypeScript** - Lenguaje
