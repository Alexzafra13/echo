# Echo Music Server

Servidor de streaming de música autoalojado.

## Quick Start

```bash
mkdir echo && cd echo
curl -O https://raw.githubusercontent.com/Alexzafra13/echo/main/docker-compose.yml
docker compose up -d
```

Abre http://localhost:4567 y sigue el asistente de configuración.

## Configurar rutas de música

Edita `docker-compose.yml` y añade tus rutas:

```yaml
services:
  echo:
    volumes:
      - ./data:/app/data
      - /tu/ruta/musica:/music:ro      # Añade tus rutas
      - /otro/disco:/disco2:ro         # Puedes añadir varias
```

Reinicia: `docker compose restart echo`

## Configuración opcional

Crea un archivo `.env` junto al `docker-compose.yml`:

```bash
# Cambiar puerto (default: 4567)
ECHO_PORT=8080

# Contraseñas personalizadas (recomendado en producción)
POSTGRES_PASSWORD=tu_password_segura
REDIS_PASSWORD=otra_password_segura
```

## Comandos útiles

```bash
docker compose up -d            # Iniciar
docker compose down             # Parar
docker compose logs -f echo     # Ver logs
docker compose pull && docker compose up -d  # Actualizar
```

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [Configuración](docs/configuration.md) | Variables de entorno y puertos |
| [Reverse Proxy](docs/reverse-proxy.md) | Nginx, Caddy, Traefik con HTTPS |
| [Backups](docs/backup.md) | Backup, restauración y migración |
| [Desarrollo](docs/development.md) | Contribuir al proyecto |

## Stack

- **Backend:** NestJS + Fastify + Drizzle ORM + PostgreSQL + Redis
- **Frontend:** React + Vite + Zustand + Socket.io

---

<details>
<summary><b>docker-compose.yml</b> (clic para copiar)</summary>

```yaml
# =============================================
# Echo Music Server
# =============================================
# docker compose up -d
# Abre http://localhost:4567
# =============================================

services:
  echo:
    image: ghcr.io/alexzafra13/echo:latest
    container_name: echo
    ports:
      - "${ECHO_PORT:-4567}:4567"
    volumes:
      - ./data:/app/data
      - /mnt:/mnt:ro
      - /media:/media:ro
      # Añade tus rutas de música:
      # - /home/usuario/Musica:/music:ro
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER:-echo}:${POSTGRES_PASSWORD:-echo_music_server}@postgres:5432/${POSTGRES_DB:-echo}
      REDIS_HOST: redis
      REDIS_PASSWORD: ${REDIS_PASSWORD:-echo_music_server}
      DATA_PATH: /app/data
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - echo-network

  postgres:
    image: postgres:16-alpine
    container_name: echo-postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-echo}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-echo_music_server}
      POSTGRES_DB: ${POSTGRES_DB:-echo}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-echo}"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - echo-network

  redis:
    image: redis:7-alpine
    container_name: echo-redis
    command: redis-server --requirepass ${REDIS_PASSWORD:-echo_music_server}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--pass", "${REDIS_PASSWORD:-echo_music_server}", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - echo-network

networks:
  echo-network:
    name: echo-network

volumes:
  postgres_data:
  redis_data:
```

</details>

## Licencia

ISC
