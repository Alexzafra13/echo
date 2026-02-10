# Configuración

## Variables de entorno

### Producción (.env)

Crea un archivo `.env` junto a `docker-compose.yml`:

```bash
# Puerto de Echo (default: 4567)
ECHO_PORT=4567

# Base de datos
POSTGRES_USER=echo
POSTGRES_PASSWORD=tu_password_segura
POSTGRES_DB=echo

# Redis
REDIS_PASSWORD=otra_password_segura

# CORS (opcional, para dominios personalizados)
CORS_ORIGINS=https://music.tudominio.com
```

### Variables completas

| Variable | Default | Descripción |
|----------|---------|-------------|
| `ECHO_PORT` | `4567` | Puerto externo |
| `POSTGRES_USER` | `echo` | Usuario PostgreSQL |
| `POSTGRES_PASSWORD` | auto-generado | Contraseña PostgreSQL |
| `POSTGRES_DB` | `echo` | Nombre de la BD |
| `REDIS_PASSWORD` | auto-generado | Contraseña Redis |
| `DATA_PATH` | `/app/data` | Ruta datos internos |
| `CORS_ORIGINS` | auto-detectado | Orígenes CORS permitidos |

### Desarrollo (api/.env)

Se genera automáticamente con `pnpm quickstart`:

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://music_user:music_password@localhost:5432/music_db
JWT_SECRET=<auto-generado>
JWT_REFRESH_SECRET=<auto-generado>
REDIS_HOST=localhost
REDIS_PASSWORD=dev_redis_password
```

## Volúmenes

| Volumen | Descripción | Backup |
|---------|-------------|--------|
| `./data:/app/data` | Covers, metadatos, config | Sí |
| `postgres_data` | Base de datos | Sí |
| `redis_data` | Caché | No (se regenera) |
| `/mnt:/mnt:ro` | Música (solo lectura) | No |

## Puertos

| Puerto | Servicio | Entorno |
|--------|----------|---------|
| 4567 | Echo | Producción |
| 5173 | Frontend | Desarrollo |
| 3000 | Backend | Desarrollo |
| 5432 | PostgreSQL | Desarrollo (expuesto) |
| 6379 | Redis | Desarrollo (expuesto) |

> En producción, PostgreSQL y Redis no están expuestos (solo accesibles dentro de la red Docker).

## Rutas de música

Añade volúmenes de solo lectura:

```yaml
services:
  echo:
    volumes:
      - ./data:/app/data
      - /mnt/nas/musica:/music:ro
      - /home/user/Music:/local:ro
```

Las rutas aparecerán en el panel de administración para configurar bibliotecas.

## Seguridad

- **JWT secrets**: Se auto-generan en `/app/data/secrets.env` en primera ejecución
- **Contraseñas**: Usa valores únicos en `.env` para producción
- **Música**: Montada como solo lectura (`:ro`)
- **Red Docker**: PostgreSQL/Redis aislados, no expuestos
