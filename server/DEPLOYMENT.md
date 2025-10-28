# Deployment Guide - Echo Music Server

## 📦 Production Deployment

Esta guía te ayudará a desplegar **Echo Music Server** en producción usando Docker.

---

## 🚀 Quick Start

### 1. Configuración de Entorno

```bash
# Copiar plantilla de variables de entorno
cp .env.example .env.production

# Editar con tus valores de producción
nano .env.production
```

**IMPORTANTE:** Genera secretos seguros:

```bash
# Para JWT_SECRET y JWT_REFRESH_SECRET
openssl rand -base64 32
```

### 2. Configurar Variables Críticas

Edita `.env.production` y configura:

```bash
# ⚠️ OBLIGATORIO - Cambiar en producción
DATABASE_URL="postgresql://music_admin:STRONG_PASSWORD_HERE@postgres:5432/music_server"
POSTGRES_PASSWORD="STRONG_PASSWORD_HERE"
REDIS_PASSWORD="ANOTHER_STRONG_PASSWORD"
JWT_SECRET="GENERATE_WITH_OPENSSL_RAND_BASE64_32"
JWT_REFRESH_SECRET="GENERATE_WITH_OPENSSL_RAND_BASE64_32"

# Configurar dominio/IP de producción
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
```

### 3. Iniciar Servicios

```bash
# Construir y levantar en background
docker-compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# Ver logs
docker compose -f docker-compose.prod.yml logs -f app

# Verificar estado
docker compose -f docker-compose.prod.yml ps
```

### 4. Migraciones de Base de Datos

```bash
# Conectarse al contenedor de la app
docker exec -it echo-api-prod sh

# Ejecutar migraciones
pnpm db:migrate

# Salir del contenedor
exit
```

### 5. Verificar Despliegue

```bash
# Health check
curl http://localhost:3000/health

# API docs (solo en desarrollo)
open http://localhost:3000/api/docs
```

---

## 🏗️ Arquitectura de Producción

```
┌─────────────┐
│   Nginx     │  (Reverse Proxy - Opcional)
│   Port 80   │
└──────┬──────┘
       │
┌──────▼──────────────────────────┐
│  NestJS Application (Port 3000) │
│  - Scanner Module                │
│  - Streaming                     │
│  - API REST                      │
└──────┬────────────┬──────────────┘
       │            │
┌──────▼───┐  ┌────▼────────┐
│PostgreSQL│  │    Redis    │
│  Port    │  │  (Cache +   │
│  5432    │  │   Queue)    │
└──────────┘  └─────────────┘
```

---

## 🔧 Configuración Avanzada

### Multi-Stage Build

El `Dockerfile` usa multi-stage build para optimizar tamaño:

1. **dependencies**: Instala node_modules
2. **builder**: Compila TypeScript
3. **production**: Imagen final (~200MB)

### Volúmenes Persistentes

```yaml
volumes:
  postgres_data:    # Base de datos
  redis_data:       # Cache + cola de trabajos
  music_data:       # Archivos de música
  covers_data:      # Portadas de álbumes
```

**Backup de volúmenes:**

```bash
# Backup de PostgreSQL
docker exec echo-postgres-prod pg_dump -U music_admin music_server > backup.sql

# Backup de música
docker run --rm -v echo_music_data:/data -v $(pwd):/backup alpine tar czf /backup/music_backup.tar.gz /data
```

### Nginx como Reverse Proxy

Descomenta la sección de Nginx en `docker-compose.prod.yml` y crea:

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name yourdomain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Streaming endpoints - mayor timeout
        location /api/streaming {
            proxy_pass http://app;
            proxy_buffering off;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 300s;
        }

        # Upload limit para escaneo
        client_max_body_size 100M;
    }
}
```

---

## 📊 Monitoreo

### Logs

```bash
# Todos los servicios
docker compose -f docker-compose.prod.yml logs -f

# Solo la app
docker compose -f docker-compose.prod.yml logs -f app

# PostgreSQL
docker compose -f docker-compose.prod.yml logs -f postgres

# Redis
docker compose -f docker-compose.prod.yml logs -f redis
```

### Métricas

```bash
# Estado de contenedores
docker stats

# Uso de volúmenes
docker system df -v

# Health checks
docker inspect --format='{{json .State.Health}}' echo-api-prod | jq
```

---

## 🔐 Seguridad

### Checklist de Producción

- [ ] ✅ Cambiar todas las contraseñas por defecto
- [ ] ✅ Usar JWT secrets generados con `openssl rand -base64 32`
- [ ] ✅ Configurar CORS solo para dominios específicos
- [ ] ✅ Habilitar HTTPS con certificados SSL válidos
- [ ] ✅ Configurar firewall (solo puertos 80, 443 expuestos)
- [ ] ✅ Backups automáticos de PostgreSQL
- [ ] ✅ Limitar acceso a endpoints de admin
- [ ] ✅ Revisar logs regularmente
- [ ] ✅ Mantener Docker images actualizadas

### Variables Sensibles

**NUNCA** commiteé `.env.production` al repositorio.

Usa **secretos** de tu plataforma:
- Docker Swarm Secrets
- Kubernetes Secrets
- AWS Secrets Manager
- HashiCorp Vault

---

## 🔄 Actualización

### Rolling Update

```bash
# Pull nueva versión del código
git pull origin main

# Reconstruir solo la app
docker compose -f docker-compose.prod.yml up -d --build --no-deps app

# Verificar
docker compose -f docker-compose.prod.yml logs -f app
```

### Rollback

```bash
# Volver a versión anterior
git checkout <previous-commit>

# Rebuild
docker compose -f docker-compose.prod.yml up -d --build --no-deps app
```

---

## 🐛 Troubleshooting

### App no inicia

```bash
# Ver logs detallados
docker compose -f docker-compose.prod.yml logs app

# Verificar variables de entorno
docker exec echo-api-prod env | grep DATABASE_URL
```

### PostgreSQL connection failed

```bash
# Verificar que PostgreSQL esté corriendo
docker compose -f docker-compose.prod.yml ps postgres

# Probar conexión manualmente
docker exec -it echo-postgres-prod psql -U music_admin -d music_server
```

### Redis connection failed

```bash
# Verificar Redis
docker exec -it echo-redis-prod redis-cli ping

# Con password
docker exec -it echo-redis-prod redis-cli -a YOUR_PASSWORD ping
```

### Cache no funciona

```bash
# Verificar variable ENABLE_CACHE
docker exec echo-api-prod env | grep ENABLE_CACHE

# Ver logs de Redis
docker compose -f docker-compose.prod.yml logs redis

# Limpiar cache
docker exec -it echo-redis-prod redis-cli -a YOUR_PASSWORD FLUSHALL
```

---

## 📈 Optimización

### Performance

1. **Cache habilitado:**
   ```bash
   ENABLE_CACHE=true
   ```

2. **Ajustar TTL según tráfico:**
   ```bash
   CACHE_TRACK_TTL=7200   # 2 horas para alto tráfico
   ```

3. **Aumentar workers de Nginx:**
   ```nginx
   worker_processes auto;
   ```

### Escalamiento Horizontal

Para escalar la app:

```yaml
# docker-compose.prod.yml
services:
  app:
    deploy:
      replicas: 3
```

Requiere:
- Load balancer (Nginx/HAProxy)
- Session storage compartido (Redis ya configurado)

---

## 🌐 Providers Cloud

### AWS EC2

1. Lanzar instancia Ubuntu 22.04
2. Instalar Docker + Docker Compose
3. Abrir puertos 80, 443 en Security Groups
4. Seguir guía de Quick Start

### DigitalOcean Droplet

```bash
# One-liner setup
curl -fsSL https://get.docker.com | sh
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### Heroku / Railway / Render

Requiere adaptaciones (PaaS no soporta Docker Compose directamente).
Recomendación: Usar Dockerfile con variables de entorno del provider.

---

## 📝 Mantenimiento

### Backups Automáticos

Script de ejemplo (`backup.sh`):

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)

# Backup PostgreSQL
docker exec echo-postgres-prod pg_dump -U music_admin music_server > /backups/db_$DATE.sql

# Backup música (incremental)
docker run --rm -v echo_music_data:/data -v /backups:/backup alpine tar czf /backup/music_$DATE.tar.gz /data

# Mantener solo últimos 7 días
find /backups -name "*.sql" -mtime +7 -delete
find /backups -name "*.tar.gz" -mtime +7 -delete
```

Agregar a crontab:
```bash
0 2 * * * /path/to/backup.sh
```

---

## ✅ Resumen

**Echo Music Server** está listo para producción con:

- ✅ **Docker multi-stage** (optimizado)
- ✅ **PostgreSQL** (persistente)
- ✅ **Redis** (cache + queue)
- ✅ **Health checks**
- ✅ **Non-root user** (seguridad)
- ✅ **Volumes** (datos persistentes)
- ✅ **Configurable** (.env.example)
- ✅ **Escalable** (puede añadir réplicas)

**Siguiente paso:** Configurar monitoring con Prometheus + Grafana (opcional)
