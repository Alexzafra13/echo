# Configuración

## Variables de entorno

### Producción (docker-compose.yml)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Modo de ejecución |
| `DATABASE_URL` | - | URL conexión PostgreSQL |
| `REDIS_HOST` | `redis` | Host de Redis |
| `REDIS_PASSWORD` | - | Contraseña Redis |
| `DATA_PATH` | `/app/data` | Ruta datos persistentes |

### Desarrollo (server/.env)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Modo desarrollo |
| `PORT` | `3000` | Puerto backend |
| `DATABASE_URL` | - | URL PostgreSQL local |
| `JWT_SECRET` | - | Secreto JWT (auto-generado en producción) |
| `JWT_EXPIRATION` | `7d` | Expiración tokens |
| `REDIS_HOST` | `localhost` | Host Redis |
| `CORS_ORIGINS` | `localhost:5173` | Orígenes permitidos |

## Volúmenes Docker

| Volumen | Contenido |
|---------|-----------|
| `./data` | Configuración, metadatos, covers |
| `/mnt:/mnt:ro` | Punto montaje música (solo lectura) |
| `/media:/media:ro` | Punto montaje música (solo lectura) |
| `postgres_data` | Base de datos |

## Puertos

| Puerto | Servicio |
|--------|----------|
| 4567 | Echo (producción) |
| 5173 | Frontend (desarrollo) |
| 3000 | Backend (desarrollo) |
| 5432 | PostgreSQL |
| 6379 | Redis |

## Seguridad

- JWT secrets se auto-generan en primera ejecución
- Contraseñas mínimo 12 caracteres en producción
- Música montada como solo lectura (`:ro`)
- PostgreSQL/Redis no expuestos en producción
