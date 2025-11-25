# Desarrollo

## Requisitos

- Node.js >= 22
- pnpm >= 10
- Docker Desktop

## Setup inicial

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo

# Instalar dependencias
pnpm install

# Levantar PostgreSQL + Redis
pnpm docker:dev

# Configurar backend
cd server
cp .env.example .env
pnpm db:reset
cd ..

# Iniciar desarrollo
pnpm dev:all
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `pnpm dev:all` | Frontend + Backend con hot-reload |
| `pnpm docker:dev` | Levantar PostgreSQL + Redis |
| `pnpm docker:dev:down` | Parar PostgreSQL + Redis |
| `pnpm db:reset` | Reset base de datos |
| `pnpm db:migrate` | Aplicar migraciones |
| `pnpm reset` | Reset completo (si hay problemas) |

## URLs

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Swagger | http://localhost:3000/api/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## Arquitectura

```
echo/
├── frontend/          # React + Vite
│   └── src/
│       ├── features/  # Módulos por funcionalidad
│       └── shared/    # Componentes compartidos
├── server/            # NestJS
│   └── src/
│       ├── features/  # Módulos por funcionalidad
│       └── shared/    # Utilidades compartidas
└── docker-compose.dev.yml  # Solo DB/Redis para desarrollo
```

## Build producción local

```bash
# Construir imagen
pnpm docker:build

# Ejecutar
pnpm docker:up

# Ver logs
pnpm docker:logs
```

La aplicación estará en http://localhost:4567
