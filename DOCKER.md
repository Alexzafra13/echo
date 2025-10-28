# 🐳 Docker Deployment Guide

Echo follows the **Jellyfin/Navidrome pattern**: a single container that serves both the backend API and frontend web UI.

## 📦 Architecture

```
┌─────────────────────────────────────┐
│   echo-app (Single Container)      │
│                                     │
│   ┌─────────────────────────────┐  │
│   │   Frontend (React/Vite)     │  │
│   │   Served as static files    │  │
│   └─────────────────────────────┘  │
│                                     │
│   ┌─────────────────────────────┐  │
│   │   Backend (NestJS/Fastify)  │  │
│   │   - API endpoints           │  │
│   │   - Audio streaming         │  │
│   │   - Music scanner           │  │
│   └─────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
         │                │
         ├─ PostgreSQL    │
         └─ Redis ────────┘
```

## 🚀 Quick Start

### 1. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your settings
nano .env
```

**Important variables to set:**
```env
# Security (REQUIRED in production!)
JWT_SECRET=your_super_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Database
POSTGRES_PASSWORD=change_me

# Music library path (absolute or relative)
MUSIC_PATH=/path/to/your/music
```

### 2. Build and Run

```bash
# Build the full-stack image
pnpm docker:build

# Start all services (app + postgres + redis)
pnpm docker:up

# View logs
pnpm docker:logs
```

### 3. Access

- **Web UI**: http://localhost:4567
- **API**: http://localhost:4567/api
- **Swagger Docs**: http://localhost:4567/api/docs

### 4. First-time setup

The container will automatically:
1. Wait for PostgreSQL to be ready
2. Run database migrations
3. Start the application

## 🛠️ Available Commands

```bash
# Build
pnpm docker:build              # Build the full-stack image

# Lifecycle
pnpm docker:up                 # Start all services
pnpm docker:down               # Stop all services
pnpm docker:restart            # Restart the app
pnpm docker:logs               # Follow app logs

# Development (DB + Redis only, app runs locally)
pnpm docker:dev                # Start only postgres + redis
pnpm docker:dev:down           # Stop dev services
```

## 📁 Volumes

The following volumes are created for persistence:

```yaml
volumes:
  echo-postgres-data    # PostgreSQL database
  echo-redis-data       # Redis cache
  echo-uploads          # Uploaded covers and metadata
  echo-logs             # Application logs
```

**Your music library** is mounted as a bind mount from `MUSIC_PATH`.

## 🔐 Production Deployment

### Security Checklist

- [ ] Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Change database passwords
- [ ] Use HTTPS with reverse proxy (nginx/Caddy/Traefik)
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Limit exposed ports (only 4567 if behind proxy)

### Example with Nginx

```nginx
server {
    listen 80;
    server_name echo.yourdomain.com;

    location / {
        proxy_pass http://localhost:4567;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (for future features)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Docker Compose Production

```yaml
services:
  echo-app:
    image: echo-music-server:latest
    restart: always  # Auto-restart on crash
    environment:
      NODE_ENV: production
    # ... rest of config
```

## 🔄 Updates

```bash
# Pull latest code
git pull origin main

# Rebuild image
pnpm docker:build

# Restart with new image
pnpm docker:down
pnpm docker:up
```

## 🐛 Troubleshooting

### Container won't start

```bash
# Check logs
pnpm docker:logs

# Check health
docker ps | grep echo
```

### Database connection errors

```bash
# Ensure postgres is healthy
docker ps | grep postgres

# Check DATABASE_URL in .env
```

### Frontend not loading

```bash
# Verify frontend was built in image
docker exec echo-app ls -la /app/frontend/dist

# Check backend logs for frontend serving
pnpm docker:logs | grep "Serving frontend"
```

### Port already in use

```bash
# Change APP_PORT in .env
APP_PORT=8080

# Or stop conflicting service
sudo lsof -ti:4567 | xargs kill
```

## 📊 Resource Requirements

**Minimum:**
- 1 CPU core
- 2 GB RAM
- 10 GB disk space (+ your music library)

**Recommended:**
- 2 CPU cores
- 4 GB RAM
- SSD storage for database and cache

## 🎵 Similar Projects

Echo follows the same deployment pattern as:
- [Jellyfin](https://jellyfin.org/) - Media server
- [Navidrome](https://www.navidrome.org/) - Music server
- [Airsonic](https://airsonic.github.io/) - Music streaming

This **single-container approach** simplifies deployment and is ideal for self-hosting.

## 📚 Advanced

### Multi-stage build details

The `Dockerfile.fullstack` uses 4 stages:

1. **frontend-builder**: Builds React app with Vite
2. **backend-dependencies**: Installs backend deps and Prisma
3. **backend-builder**: Compiles NestJS app
4. **production**: Combines everything in minimal Alpine image

### Custom music library scanner

```bash
# Enter container
docker exec -it echo-app sh

# Run scanner manually (if needed)
# TODO: Add scanner CLI command
```

### Backup

```bash
# Backup database
docker exec echo-postgres pg_dump -U music_admin music_server > backup.sql

# Backup uploads
docker cp echo-app:/app/uploads ./uploads-backup
```

## 🤝 Support

For issues related to Docker deployment, please check:
- [GitHub Issues](https://github.com/Alexzafra13/echo/issues)
- [Docker Documentation](./server/DOCKER.md)
- [Main README](./README.md)
