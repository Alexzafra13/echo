# Desarrollo

## Requisitos

- Node.js >= 22
- pnpm >= 10
- Docker

## Setup inicial

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
pnpm setup
```

Esto ejecuta automáticamente:
1. `pnpm install` - Instala dependencias
2. `pnpm docker:dev` - Levanta PostgreSQL + Redis
3. Genera `server/.env` con JWT secrets seguros
4. `pnpm db:reset` - Aplica migraciones y seed

## Desarrollo

```bash
pnpm dev:all    # Frontend + Backend con hot-reload
```

## Comandos

### Root (monorepo)

| Comando | Descripción |
|---------|-------------|
| `pnpm setup` | Setup inicial completo |
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
| `pnpm db:studio` | Abrir Prisma Studio |
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
| Prisma Studio | http://localhost:5555 |

## Estructura

```
echo/
├── frontend/           # React + Vite
│   └── src/features/   # Módulos por funcionalidad
├── server/             # NestJS
│   └── src/features/   # Módulos por funcionalidad
├── docker-compose.yml      # Producción
└── docker-compose.dev.yml  # Solo DB/Redis para desarrollo
```

## Producción local

```bash
pnpm docker:build   # Construir imagen
pnpm docker:up      # Ejecutar
pnpm docker:logs    # Ver logs
pnpm docker:down    # Parar
```

Disponible en http://localhost:4567
