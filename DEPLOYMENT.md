# 🚀 Guía de Despliegue - Echo Music Server

Esta guía te ayudará a desplegar Echo en tu servidor casero usando Docker Compose y la imagen pre-construida desde GitHub Container Registry (GHCR).

## 📋 Requisitos Previos

- Docker instalado (v20.10+)
- Docker Compose instalado (v2.0+)
- Al menos 2GB de RAM disponible
- 10GB de espacio en disco (más espacio para tu biblioteca de música)

## 🎵 Opción 1: Despliegue Rápido (Recomendado)

### Usando Imagen Pre-construida de GHCR

Esta es la forma más rápida y recomendada. No necesitas compilar nada.

#### 1. Clonar el Repositorio (o solo descargar el archivo necesario)

```bash
# Opción A: Clonar todo el repositorio
git clone https://github.com/Alexzafra13/echo.git
cd echo

# Opción B: Solo descargar el archivo docker-compose
curl -O https://raw.githubusercontent.com/Alexzafra13/echo/main/docker-compose.ghcr.yml
```

#### 2. Configurar Variables de Entorno (Opcional)

Crea un archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
nano .env  # o usa tu editor favorito
```

**Mínimo recomendado para producción:**

```env
# Ruta a tu biblioteca de música
MUSIC_PATH=/mnt/nas/music

# Cambiar passwords en producción
POSTGRES_PASSWORD=tu_password_super_seguro_aqui
REDIS_PASSWORD=otro_password_super_seguro_aqui

# Puerto (opcional, por defecto 4567)
APP_PORT=4567

# Versión de la imagen (opcional, por defecto latest)
VERSION=latest
```

#### 3. Iniciar Echo

```bash
# Usando docker-compose.ghcr.yml
docker compose -f docker-compose.ghcr.yml up -d

# O si renombraste el archivo a docker-compose.yml
docker compose up -d
```

#### 4. Acceder a Echo

Abre tu navegador en: `http://localhost:4567` (o `http://IP_DE_TU_SERVIDOR:4567`)

**Credenciales por defecto:**
- Usuario: `admin`
- Contraseña: `admin123`

⚠️ **¡IMPORTANTE!** Cambia la contraseña del admin inmediatamente después del primer login.

## 🔧 Opción 2: Compilar Imagen Localmente

Si prefieres compilar la imagen tú mismo:

```bash
# Usar docker-compose.yml (que compila la imagen)
docker compose up -d
```

## 📦 Actualizar a una Nueva Versión

### Desde GHCR (Recomendado)

```bash
# 1. Detener los contenedores
docker compose -f docker-compose.ghcr.yml down

# 2. Descargar la última imagen
docker compose -f docker-compose.ghcr.yml pull

# 3. Iniciar con la nueva versión
docker compose -f docker-compose.ghcr.yml up -d
```

### Versión Específica

Puedes especificar una versión en tu `.env`:

```env
VERSION=v1.2.3  # o cualquier tag disponible
```

Versiones disponibles: https://github.com/Alexzafra13/echo/pkgs/container/echo

## 🔍 Verificar Estado

```bash
# Ver logs de todos los servicios
docker compose -f docker-compose.ghcr.yml logs -f

# Ver solo logs de Echo
docker compose -f docker-compose.ghcr.yml logs -f echo-app

# Ver estado de los servicios
docker compose -f docker-compose.ghcr.yml ps
```

## 🛑 Detener Echo

```bash
# Detener servicios (datos se mantienen)
docker compose -f docker-compose.ghcr.yml down

# Detener y eliminar TODOS los datos (¡cuidado!)
docker compose -f docker-compose.ghcr.yml down -v
```

## 📂 Gestión de Datos

### Volúmenes Persistentes

Echo usa los siguientes volúmenes para almacenar datos:

- `echo-postgres-data`: Base de datos PostgreSQL
- `echo-redis-data`: Cache de Redis
- `echo-config`: Configuración y secretos auto-generados
- `echo-uploads`: Metadatos y covers subidas
- `echo-logs`: Logs de la aplicación

### Backup

```bash
# Backup de la base de datos
docker compose -f docker-compose.ghcr.yml exec postgres pg_dump -U music_admin music_server > backup.sql

# Backup de todos los volúmenes
docker run --rm -v echo-postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
docker run --rm -v echo-uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz /data
docker run --rm -v echo-config:/data -v $(pwd):/backup alpine tar czf /backup/config-backup.tar.gz /data
```

### Restaurar Backup

```bash
# Restaurar base de datos
docker compose -f docker-compose.ghcr.yml exec -T postgres psql -U music_admin music_server < backup.sql
```

## 🌐 Acceso desde Internet (Opcional)

### Opción A: Usando Nginx Reverse Proxy

Ejemplo de configuración nginx:

```nginx
server {
    listen 80;
    server_name music.tudominio.com;

    location / {
        proxy_pass http://localhost:4567;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
    }
}
```

### Opción B: Usando Traefik

Agrega estas labels al servicio echo-app en docker-compose.ghcr.yml:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.echo.rule=Host(`music.tudominio.com`)"
  - "traefik.http.routers.echo.entrypoints=websecure"
  - "traefik.http.routers.echo.tls.certresolver=letsencrypt"
```

## 🔧 Troubleshooting

### Problema: No puedo conectarme a Echo

1. Verifica que los contenedores estén corriendo:
   ```bash
   docker compose -f docker-compose.ghcr.yml ps
   ```

2. Revisa los logs:
   ```bash
   docker compose -f docker-compose.ghcr.yml logs echo-app
   ```

3. Verifica el firewall:
   ```bash
   sudo ufw allow 4567/tcp
   ```

### Problema: Echo no encuentra mi música

Verifica que la ruta `MUSIC_PATH` en `.env` sea correcta y que el contenedor tenga permisos:

```bash
# Ver si el volumen está montado correctamente
docker compose -f docker-compose.ghcr.yml exec echo-app ls -la /music
```

### Problema: Base de datos no inicializa

```bash
# Ver logs de PostgreSQL
docker compose -f docker-compose.ghcr.yml logs postgres

# Reiniciar solo PostgreSQL
docker compose -f docker-compose.ghcr.yml restart postgres
```

### Resetear Admin Password

Si olvidaste la contraseña del admin:

```bash
docker compose -f docker-compose.ghcr.yml exec echo-app node scripts/reset-admin-password.js
```

## 📊 Monitoreo

### Health Check

Echo incluye un endpoint de health check:

```bash
curl http://localhost:4567/health
```

### Recursos

Ver uso de recursos:

```bash
docker stats echo-app echo-postgres echo-redis
```

## 🔐 Seguridad

### Recomendaciones para Producción

1. **Cambiar passwords por defecto** en `.env`:
   ```bash
   # Generar passwords seguros
   openssl rand -base64 32
   ```

2. **No exponer PostgreSQL ni Redis** directamente a internet (ya está configurado por defecto)

3. **Usar HTTPS** con un reverse proxy (nginx/traefik)

4. **Actualizar regularmente**:
   ```bash
   docker compose -f docker-compose.ghcr.yml pull
   docker compose -f docker-compose.ghcr.yml up -d
   ```

5. **Configurar backups automáticos** con un cron job

## 🆘 Soporte

- **Issues**: https://github.com/Alexzafra13/echo/issues
- **Documentación**: https://github.com/Alexzafra13/echo

## 📝 Ejemplo Completo: Servidor Casero con Jellyfin

Si ya tienes Jellyfin corriendo, puedes usar la misma configuración de red:

```yaml
# Agregar Echo a tu red existente
networks:
  media-network:
    external: true  # Usar red existente de Jellyfin

services:
  echo-app:
    # ... configuración de echo
    networks:
      - media-network
```

---

¡Disfruta de tu servidor de música Echo! 🎵
