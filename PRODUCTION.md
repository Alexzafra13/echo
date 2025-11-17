# Echo - Production Deployment Guide

Despliegue en producción ultra-simple, inspirado en Jellyfin.

## 🚀 Quick Start (3 Pasos)

### 1. Generar Secrets de JWT

```bash
# Opción A: Script automático (recomendado)
bash scripts/generate-secrets.sh

# Opción B: Manual
openssl rand -base64 64  # Copiar para JWT_SECRET
openssl rand -base64 64  # Copiar para JWT_REFRESH_SECRET
```

### 2. Configurar .env

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar y pegar los secrets generados
nano .env  # o tu editor favorito
```

Solo necesitas cambiar:
- `JWT_SECRET` - Pegar el primer secret generado
- `JWT_REFRESH_SECRET` - Pegar el segundo secret generado
- `MUSIC_PATH` - Ruta a tu biblioteca de música (opcional)

**¡Todo lo demás ya tiene valores por defecto sensatos!**

### 3. Levantar el Servidor

```bash
docker compose up -d
```

**¡Eso es todo!** 🎉

Accede en: **http://localhost:4567**

Credenciales iniciales:
- Usuario: `admin`
- Contraseña: `admin123`
- ⚠️ Deberás cambiarla en el primer login

---

## 📋 ¿Qué Hace Automáticamente?

El servidor se auto-configura en el primer arranque:

1. ✅ **Espera** a que PostgreSQL y Redis estén listos
2. ✅ **Detecta** si es la primera ejecución
3. ✅ **Ejecuta** migraciones de base de datos automáticamente
4. ✅ **Crea** usuario admin con contraseña por defecto
5. ✅ **Muestra** credenciales en los logs
6. ✅ **Inicia** el servidor completo (API + Frontend)

Todo esto sin intervención manual - **como Jellyfin**.

---

## 🔍 Ver Logs

```bash
# Ver logs en tiempo real
docker compose logs -f echo-app

# Ver solo los logs de inicio
docker compose logs echo-app | head -50
```

Busca esta sección en los logs:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 IMPORTANT: Default Credentials
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Username: admin
   Password: admin123

⚠️  CHANGE THIS PASSWORD IMMEDIATELY!
   You'll be prompted on first login.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎵 Configurar Tu Biblioteca de Música

### Opción 1: Usar una carpeta local (testing)

```bash
# En .env:
MUSIC_PATH=./music

# Crear carpeta y copiar música
mkdir music
cp -r /ruta/a/tu/musica/* music/
```

### Opción 2: Montar carpeta existente (recomendado)

```bash
# En .env:
MUSIC_PATH=/ruta/completa/a/tu/biblioteca/musica

# Ejemplo Linux:
MUSIC_PATH=/mnt/music

# Ejemplo Windows:
MUSIC_PATH=C:/Users/TuUsuario/Music

# Ejemplo macOS:
MUSIC_PATH=/Users/TuUsuario/Music
```

Después de configurar, reinicia:

```bash
docker compose restart echo-app
```

---

## 🛠️ Comandos Útiles

```bash
# Ver estado
docker compose ps

# Detener
docker compose down

# Reiniciar
docker compose restart echo-app

# Ver logs
docker compose logs -f echo-app

# Limpiar TODO y empezar desde cero
docker compose down -v
rm .env
# Luego volver a paso 1
```

---

## 🌐 Acceso Externo (Internet)

### 1. Cambiar CORS en .env

```bash
# Agregar tu dominio
CORS_ORIGINS=http://localhost:4567,https://tudominio.com
```

### 2. Configurar Reverse Proxy (Nginx ejemplo)

```nginx
server {
    listen 80;
    server_name tudominio.com;

    location / {
        proxy_pass http://localhost:4567;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Configurar HTTPS con Let's Encrypt

```bash
sudo certbot --nginx -d tudominio.com
```

---

## 📊 Arquitectura de Producción

```
┌─────────────────────────────────────────┐
│  Puerto 4567 (Echo Container)           │
│  ┌─────────────┐  ┌──────────────┐     │
│  │  Frontend   │  │  Backend API │     │
│  │  (Static)   │  │  (NestJS)    │     │
│  └─────────────┘  └──────────────┘     │
└─────────────────────────────────────────┘
           │                  │
           ▼                  ▼
    ┌──────────┐       ┌──────────┐
    │PostgreSQL│       │  Redis   │
    │  (DB)    │       │ (Cache)  │
    └──────────┘       └──────────┘
```

**Un solo contenedor** sirve tanto el frontend como la API.

Esto es más simple y usa menos recursos que tener containers separados.

---

## 🔒 Seguridad en Producción

### ✅ Checklist

- [ ] Generar JWT secrets aleatorios (no usar los del ejemplo)
- [ ] Cambiar contraseña del admin después del primer login
- [ ] Cambiar `POSTGRES_PASSWORD` y `REDIS_PASSWORD` en .env
- [ ] Configurar firewall para exponer solo puerto 4567
- [ ] Usar HTTPS (con Nginx + Let's Encrypt)
- [ ] Mantener Docker actualizado
- [ ] Hacer backups regulares de `/var/lib/docker/volumes`

### 🔐 Generar Nuevos Secrets

```bash
# Regenerar todos los secrets
bash scripts/generate-secrets.sh

# Reiniciar para aplicar
docker compose restart echo-app
```

---

## 💾 Backups

Los datos importantes están en volúmenes Docker:

```bash
# Ver volúmenes
docker volume ls | grep echo

# Backup de base de datos
docker compose exec postgres pg_dump -U music_admin music_server > backup.sql

# Restaurar
cat backup.sql | docker compose exec -T postgres psql -U music_admin music_server
```

---

## 🐛 Troubleshooting

### Error: "JWT_SECRET is required"

```bash
# Verificar que .env existe y tiene JWT_SECRET
cat .env | grep JWT_SECRET

# Si está vacío o mal configurado:
bash scripts/generate-secrets.sh
```

### Error: No se ve el frontend

```bash
# Verificar que el build del frontend existe
docker compose exec echo-app ls /app/frontend/dist

# Si no existe, reconstruir:
docker compose build --no-cache echo-app
docker compose up -d
```

### Error: Cannot connect to database

```bash
# Verificar que PostgreSQL está corriendo
docker compose ps postgres

# Ver logs de PostgreSQL
docker compose logs postgres

# Reiniciar PostgreSQL
docker compose restart postgres
sleep 5
docker compose restart echo-app
```

---

## 📈 Actualizar a Nueva Versión

```bash
# 1. Backup
docker compose exec postgres pg_dump -U music_admin music_server > backup_$(date +%Y%m%d).sql

# 2. Bajar versión actual
docker compose down

# 3. Actualizar código
git pull

# 4. Reconstruir y levantar
docker compose build --no-cache
docker compose up -d

# 5. Ver logs para verificar
docker compose logs -f echo-app
```

Las migraciones se ejecutan automáticamente en cada inicio.

---

## ❓ Soporte

- **Documentación**: Ver [README.md](./README.md)
- **Issues**: https://github.com/Alexzafra13/echo/issues
- **Docker Docs**: Ver [DOCKER.md](./DOCKER.md)

---

**¡Disfruta de tu servidor Echo!** 🎵
