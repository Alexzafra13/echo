# Echo Music Server

Servidor de streaming de música autoalojado.

## Instalación

### 1. Crear carpeta y descargar configuración

```bash
mkdir echo && cd echo
curl -O https://raw.githubusercontent.com/Alexzafra13/echo/main/docker-compose.yml
```

O crea el archivo `docker-compose.yml` manualmente ([ver plantilla](#docker-composeyml-plantilla)).

### 2. Configurar rutas de música

Edita `docker-compose.yml` y añade tus carpetas de música:

```yaml
services:
  echo:
    volumes:
      - ./data:/app/data
      - /ruta/a/tu/musica:/music:ro    # <- Cambia esto
      # Puedes añadir varias rutas:
      # - /otro/disco:/disco2:ro
```

### 3. Iniciar

```bash
docker compose up -d
```

### 4. Abrir navegador

Abre http://localhost:4567 y sigue el asistente de configuración.

---

## Comandos útiles

```bash
docker compose up -d              # Iniciar
docker compose down               # Parar
docker compose logs -f echo       # Ver logs
docker compose restart echo       # Reiniciar
docker compose pull && docker compose up -d   # Actualizar a última versión
```

## Configuración adicional

### Cambiar puerto

Crea un archivo `.env` junto al `docker-compose.yml`:

```bash
ECHO_PORT=8080
```

### Contraseñas personalizadas (recomendado para servidores expuestos)

```bash
# .env
POSTGRES_PASSWORD=contraseña_segura_1
REDIS_PASSWORD=contraseña_segura_2
```

### Exponer a internet con HTTPS

Ver [docs/reverse-proxy.md](docs/reverse-proxy.md) para configurar Nginx, Caddy o Traefik.

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [Configuración](docs/configuration.md) | Variables de entorno y puertos |
| [Reverse Proxy](docs/reverse-proxy.md) | HTTPS con Nginx, Caddy, Traefik |
| [Backups](docs/backup.md) | Backup, restauración y migración |
| [Desarrollo](docs/development.md) | Contribuir al proyecto |

---

## docker-compose.yml (plantilla)

<details>
<summary>Clic para ver/copiar</summary>

```yaml
# =============================================
# Echo Music Server
# =============================================
# 1. Guarda este archivo como docker-compose.yml
# 2. Edita las rutas de música en "volumes"
# 3. Ejecuta: docker compose up -d
# 4. Abre: http://localhost:4567
# =============================================

services:
  echo:
    image: ghcr.io/alexzafra13/echo:latest
    container_name: echo
    ports:
      - "${ECHO_PORT:-4567}:4567"
    volumes:
      - ./data:/app/data
      # === CONFIGURA TUS RUTAS DE MÚSICA AQUÍ ===
      - /ruta/a/tu/musica:/music:ro
      # Ejemplos:
      # - /home/usuario/Musica:/music:ro
      # - /mnt/nas/music:/nas:ro
      # - /media/disco2:/disco2:ro
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

---

## Stack

- **Backend:** NestJS + Fastify + Drizzle ORM + PostgreSQL + Redis
- **Frontend:** React + Vite + Zustand

## Licencia

ISC
