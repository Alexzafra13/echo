# Desarrollo

## Requisitos

- Node.js >= 22
- pnpm >= 10
- Docker

## Setup inicial

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
pnpm quickstart
```

El script:
1. Verifica Node.js >= 22, pnpm, Docker
2. Instala dependencias
3. Levanta PostgreSQL + Redis
4. Genera `api/.env` con JWT secrets
5. Aplica migraciones

## Desarrollo

```bash
pnpm dev:all    # Frontend (5173) + Backend (3000)
```

## Comandos

### Monorepo (raíz)

| Comando | Descripción |
|---------|-------------|
| `pnpm quickstart` | Setup inicial completo |
| `pnpm dev:all` | Frontend + Backend |
| `pnpm dev` | Solo backend |
| `pnpm build` | Build producción |
| `pnpm docker:dev` | Levantar DB + Redis |
| `pnpm docker:dev:down` | Parar DB + Redis |
| `pnpm db:reset` | Reset base de datos |
| `pnpm db:migrate` | Aplicar migraciones |
| `pnpm clean` | Limpiar node_modules |

### Server

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Desarrollo con hot-reload |
| `pnpm build` | Build producción |
| `pnpm start` | Ejecutar build |
| `pnpm db:studio` | Abrir Drizzle Studio |
| `pnpm db:push` | Sincronizar schema |
| `pnpm test` | Ejecutar tests |
| `pnpm lint` | Linter |

### Frontend

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Desarrollo con hot-reload |
| `pnpm build` | Build producción |
| `pnpm preview` | Preview del build |
| `pnpm test` | Ejecutar tests |
| `pnpm lint` | Linter |

## URLs desarrollo

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Swagger | http://localhost:3000/api/docs |
| Drizzle Studio | `pnpm db:studio` |

## Estructura

```
echo/
├── web/                      # React + Vite
│   └── src/
│       ├── app/              # Rutas y providers
│       ├── features/         # Módulos por funcionalidad
│       └── shared/           # Componentes y utils compartidos
├── api/                      # NestJS + Fastify
│   └── src/
│       ├── features/         # Módulos por funcionalidad
│       ├── infrastructure/   # DB, cache, websocket
│       └── shared/           # Guards, decorators, utils
├── nginx/                    # Config de ejemplo para producción
├── docs/                     # Documentación
├── docker-compose.yml        # Producción
└── docker-compose.dev.yml    # Solo DB/Redis para desarrollo
```

## Stack técnico

### Backend
- **Framework:** NestJS + Fastify
- **ORM:** Drizzle ORM
- **Base de datos:** PostgreSQL 16
- **Caché:** Redis 7
- **Auth:** JWT (access + refresh tokens)
- **Validación:** class-validator
- **Docs:** Swagger/OpenAPI

### Frontend
- **Framework:** React 18
- **Build:** Vite
- **Estado:** Zustand
- **Data fetching:** TanStack Query
- **Rutas:** Wouter
- **Realtime:** SSE (EventSource nativo)

## Producción local

```bash
pnpm docker:build   # Construir imagen
pnpm docker:up      # Ejecutar
pnpm docker:logs    # Ver logs
pnpm docker:down    # Parar
```

Disponible en http://localhost:4567

## Tests

```bash
# Backend
cd api && pnpm test
pnpm test:cov       # Con cobertura

# Frontend
cd web && pnpm test
pnpm test:ui        # Con UI
```

## Migraciones de BD

```bash
# Crear migración después de cambiar schema
cd api
pnpm db:generate

# Aplicar migraciones
pnpm db:migrate

# Push directo (desarrollo)
pnpm db:push
```
