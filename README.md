# Echo Music Server

Servidor de streaming de música autoalojado.

## Instalación con Docker

### Opción 1: Usar desde este repositorio

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
docker compose up -d

# =============================================
# Echo Music Server
# =============================================
# docker compose up -d
# Abre http://localhost:4567
# =============================================

version: "3.8"

services:
  echo:
    image: ghcr.io/alexzafra13/echo:latest
    container_name: echo
    ports:
      - "4567:4567"
    volumes:
      - ./data:/app/data          # Config, metadatos, covers
      - /mnt:/mnt:ro              # Montar /mnt del host
      - /media:/media:ro          # Montar /media del host
      # Añade más rutas si tu música está en otro sitio:
      # - /home/usuario/Musica:/music:ro
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://echo:echo_music_server@postgres:5432/echo
      REDIS_HOST: redis
      REDIS_PASSWORD: echo_music_server
      DATA_PATH: /app/data
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    container_name: echo-postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: echo
      POSTGRES_PASSWORD: echo_music_server
      POSTGRES_DB: echo
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U echo"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: echo-redis
    command: redis-server --requirepass echo_music_server
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--pass", "echo_music_server", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

```

### Opción 2: Instalación limpia

```bash
mkdir echo && cd echo
curl -O https://raw.githubusercontent.com/Alexzafra13/echo/main/docker-compose.yml
docker compose up -d
```

Abre http://localhost:4567 y sigue el asistente.

### Configurar rutas de música

El `docker-compose.yml` incluye PostgreSQL, Redis y monta `/mnt` y `/media` por defecto.

Edita las rutas según tu servidor:

```yaml
services:
  echo:
    volumes:
      - ./data:/app/data          # Datos de la aplicación
      - /mnt:/mnt:ro              # Si tienes música en /mnt
      - /media:/media:ro          # Si tienes música en /media
      - /tu/ruta/musica:/music:ro # Añade tus rutas personalizadas
```

### Comandos útiles

```bash
docker compose up -d          # Levantar servidor
docker compose logs -f echo   # Ver logs en tiempo real
docker compose down           # Parar servidor
docker compose restart echo   # Reiniciar solo Echo
```

## Desarrollo

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
pnpm quickstart   # Instala todo automáticamente
pnpm dev:all      # Inicia frontend + backend
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `pnpm quickstart` | Setup inicial completo |
| `pnpm dev:all` | Desarrollo |
| `pnpm db:reset` | Reset BD |
| `pnpm docker:dev` | Levantar DB/Redis |

## Docs

- [Desarrollo](docs/development.md)
- [Configuración](docs/configuration.md)
- [Backups](docs/backup.md)

## Stack

- **Backend:** NestJS, Prisma, PostgreSQL, Redis
- **Frontend:** React, Vite, Zustand

## Licencia

ISC

