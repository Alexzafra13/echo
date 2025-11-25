# Echo - Music Streaming Platform

Plataforma de streaming de música autoalojada. Estilo Jellyfin: plug-and-play.

## 🚀 Instalación (Docker)

```bash
# 1. Crear directorio
mkdir echo && cd echo

# 2. Descargar docker-compose
curl -O https://raw.githubusercontent.com/Alexzafra13/echo/main/docker-compose.yml

# 3. Arrancar
docker compose up -d

# 4. Abrir navegador
# http://localhost:4567
```

**¡Listo!** El asistente de configuración te guiará para:
1. Crear tu cuenta de administrador
2. Seleccionar tu carpeta de música

### Personalizar ruta de música

Por defecto se montan `/mnt` y `/media` del host. Si tu música está en otra ubicación, edita `docker-compose.yml`:

```yaml
volumes:
  - ./data:/app/data
  - /mnt:/mnt:ro
  - /media:/media:ro
  - /tu/ruta/musica:/music:ro  # <-- Añade esta línea
```

## 📦 docker-compose.yml

```yaml
version: "3.9"

services:
  echo:
    image: ghcr.io/alexzafra13/echo:latest
    container_name: echo
    ports:
      - 4567:4567
    volumes:
      - ./data:/app/data          # Config, metadatos, covers
      - /mnt:/mnt:ro              # Montar /mnt del host
      - /media:/media:ro          # Montar /media del host
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://echo:echo_music_server@postgres:5432/echo
      - REDIS_HOST=redis
      - REDIS_PASSWORD=echo_music_server
      - DATA_PATH=/app/data
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
      - POSTGRES_USER=echo
      - POSTGRES_PASSWORD=echo_music_server
      - POSTGRES_DB=echo
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
    healthcheck:
      test: ["CMD", "redis-cli", "--pass", "echo_music_server", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

## 🔧 Desarrollo Local

### Requisitos
- Node.js >= 22
- pnpm >= 10
- Docker Desktop

### Setup

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
pnpm quickstart
```

O paso a paso:

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar PostgreSQL + Redis
pnpm docker:dev

# 3. Generar .env y migrar BD
cd server && node scripts/generate-env.js && pnpm db:reset && cd ..

# 4. Iniciar
pnpm dev:all
```

### URLs Desarrollo
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Swagger: http://localhost:3000/api/docs

### Comandos

```bash
pnpm dev:all          # Frontend + Backend
pnpm docker:dev       # Levantar DB/Redis
pnpm docker:dev:down  # Parar DB/Redis
pnpm db:reset         # Reset base de datos
pnpm reset            # Reset completo (si hay problemas)
```

## 🏗️ Arquitectura

| Modo | Frontend | Backend | DB/Redis |
|------|----------|---------|----------|
| Desarrollo | :5173 | :3000 | :5432/:6379 (expuestos) |
| Producción | :4567 | :4567 | internos |

En producción, un solo contenedor sirve frontend + API en el puerto 4567.

## 🛠️ Stack

- **Backend:** NestJS, Prisma, PostgreSQL, Redis, BullMQ
- **Frontend:** React 18, Vite, Tanstack Query, Zustand

## 📄 Licencia

ISC
