# Echo - Production Deployment Guide

Despliegue en producción **100% plug-and-play**, exactamente como Jellyfin.

## 🚀 Quick Start (1 Comando)

```bash
docker compose up -d
```

**¡ESO ES TODO!** 🎉

No hay pasos 2 o 3. No hay configuración. Simplemente funciona.

### Acceso

**URL:** http://localhost:4567

**Credenciales (mostradas en logs):**
- Usuario: `admin`
- Contraseña: `admin123`
- ⚠️ Deberás cambiarla en el primer login

**Ver credenciales:**
```bash
docker compose logs echo-app | grep -A 5 "Default Credentials"
```

---

## 📋 ¿Qué Hace Automáticamente? (Jellyfin-style)

El servidor es **100% auto-configurante** en el primer arranque:

1. ✅ **Auto-genera JWT secrets** criptográficamente seguros
2. ✅ **Guarda secrets** en `/app/config/secrets.env` (persistente)
3. ✅ **Espera** a que PostgreSQL y Redis estén listos
4. ✅ **Detecta** primera ejecución (verifica tabla User)
5. ✅ **Ejecuta** migraciones de base de datos
6. ✅ **Crea** usuario admin automáticamente
7. ✅ **Muestra** credenciales en logs con formato bonito
8. ✅ **Inicia** servidor completo (API + Frontend integrados)

**Sin configuración. Sin archivos .env. Sin scripts.**

Exactamente como Jellyfin.

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

Este error NO debería aparecer ya que los secrets se auto-generan.

Si aparece, verifica que el volumen de config existe:

```bash
# Ver secrets generados
docker compose exec echo-app cat /app/config/secrets.env

# Si no existe, reiniciar contenedor:
docker compose restart echo-app
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
