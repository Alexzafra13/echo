# 🐳 Docker Guide - Echo Music Server

## Quick Start

```bash
# 1. Create environment file
cp .env.example .env.production

# 2. Start all services
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Check status
docker-compose -f docker-compose.prod.yml ps

# 4. View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

## What Gets Automated

The entrypoint script (`scripts/docker-entrypoint.sh`) automatically:

1. ✅ Waits for PostgreSQL to be ready
2. ✅ Waits for Redis to be ready
3. ✅ Runs database migrations (`prisma migrate deploy`)
4. ✅ Generates Prisma Client
5. ✅ Starts the application

**No manual intervention needed!**

## Services

- **PostgreSQL** - Port 5432 (internal)
- **Redis** - Port 6379 (internal)
- **App** - Port 3000 (exposed to host)

## Useful Commands

### Status & Logs
```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f postgres
docker-compose -f docker-compose.prod.yml logs -f redis

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### Restart & Stop
```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Restart only app (useful after code changes)
docker-compose -f docker-compose.prod.yml restart app

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (⚠️ DELETES DATABASE)
docker-compose -f docker-compose.prod.yml down -v
```

### Rebuild
```bash
# Rebuild after code changes
docker-compose -f docker-compose.prod.yml up -d --build

# Force rebuild (no cache)
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Access Containers
```bash
# Shell into app container
docker-compose -f docker-compose.prod.yml exec app sh

# Access PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres psql -U music_user -d music_db

# Access Redis CLI
docker-compose -f docker-compose.prod.yml exec redis redis-cli
```

### Health Checks
```bash
# Check if app is healthy
curl http://localhost:3000/health

# Check specific endpoints
curl http://localhost:3000/api/albums
curl http://localhost:3000/api/tracks
```

## Development Workflow

### Making Code Changes

```bash
# 1. Make your changes in src/

# 2. Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Watch logs
docker-compose -f docker-compose.prod.yml logs -f app
```

### Database Changes

```bash
# 1. Create migration locally
pnpm prisma migrate dev --name your_migration_name

# 2. Rebuild containers (migrations run automatically)
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Check logs to confirm migration
docker-compose -f docker-compose.prod.yml logs app | grep "migration"
```

### Debugging

```bash
# View app logs for errors
docker-compose -f docker-compose.prod.yml logs app | grep -i error

# Check if services are healthy
docker-compose -f docker-compose.prod.yml ps

# Shell into container
docker-compose -f docker-compose.prod.yml exec app sh
cd /app
ls -la
cat logs/app.log
```

## Environment Variables

Edit `.env.production`:

```env
# Required
DATABASE_URL=postgresql://music_user:music_password@postgres:5432/music_db
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-secret-here

# Optional
NODE_ENV=production
PORT=3000
ENABLE_CACHE=true
```

## Volumes

Data persists in Docker volumes:

- `postgres-data` - Database files
- `redis-data` - Redis data
- `./uploads` - Music files and covers (bind mount)

## Troubleshooting

### App won't start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs app

# Check if migrations failed
docker-compose -f docker-compose.prod.yml logs app | grep migration

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Database connection issues
```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.prod.yml ps postgres

# View PostgreSQL logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test connection manually
docker-compose -f docker-compose.prod.yml exec app sh
nc -zv postgres 5432
```

### Redis connection issues
```bash
# Check Redis is running
docker-compose -f docker-compose.prod.yml ps redis

# Test connection
docker-compose -f docker-compose.prod.yml exec app sh
nc -zv redis 6379
```

### Clean slate (reset everything)
```bash
# Stop and remove everything
docker-compose -f docker-compose.prod.yml down -v

# Remove all images
docker-compose -f docker-compose.prod.yml down --rmi all

# Start fresh
docker-compose -f docker-compose.prod.yml up -d --build
```

## Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Change database password
- [ ] Change Redis password
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper `MUSIC_LIBRARY_PATH`
- [ ] Set up SSL/TLS (reverse proxy like nginx)
- [ ] Configure backups for `postgres-data` volume
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure log aggregation
- [ ] Set up CI/CD pipeline

## Performance Tips

```bash
# View resource usage
docker stats

# Limit container resources (edit docker-compose.prod.yml)
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

## Support

For issues or questions:
- Check logs: `docker-compose -f docker-compose.prod.yml logs -f`
- GitHub Issues: https://github.com/your-repo/issues
