# 🗄️ Echo Music Server - Guía de Backups y Persistencia

## ⚠️ IMPORTANTE: ¿Qué datos se guardan?

Echo Music Server usa **Docker Named Volumes** para persistir tus datos. Esto significa que tus datos **sobreviven** a:

✅ `docker-compose restart` - Reinicia servicios, datos intactos
✅ `docker-compose stop` y `docker-compose start` - Datos intactos
✅ `docker-compose down` (sin -v) - Datos intactos
✅ `docker-compose up --build` - Datos intactos
✅ Actualizar imagen Docker - Datos intactos
✅ Reiniciar el host - Datos intactos

### Pero tus datos se PIERDEN con:

❌ `docker-compose down -v` - Borra TODOS los volúmenes
❌ `docker volume rm echo-postgres-data` - Borra base de datos
❌ `docker volume prune` - Borra volúmenes no usados

---

## 📦 Volúmenes y qué contienen

| Volumen | Contenido | Tamaño típico | Criticidad |
|---------|-----------|---------------|------------|
| **echo-postgres-data** | Base de datos completa (usuarios, playlists, historial, ratings) | 100MB - 2GB | 🔴 CRÍTICO |
| **echo-uploads** | Covers descargadas, avatars de usuario | 50MB - 500MB | 🟡 MEDIO |
| **echo-config** | JWT secrets (sesiones activas) | <1MB | 🟡 MEDIO |
| **echo-redis-data** | Cache (metadata temporal) | 10-50MB | 🟢 BAJO |
| **echo-logs** | Logs de aplicación | 10-100MB | 🟢 BAJO |

### ¿Qué hay en la base de datos? (echo-postgres-data)

**Datos de usuario**:
- 👤 Usuarios (username, email, password hash, config)
- 🎨 Preferencias (theme, language, avatar)
- 🔐 Sesiones activas (tokens JWT)

**Contenido musical personalizado**:
- 🎵 Playlists personalizadas
- ⭐ Favoritos (tracks, albums, artists)
- 💯 Ratings (1-5 estrellas)
- 📻 Estaciones de radio favoritas
- 🎬 Cola de reproducción actual
- 🔖 Bookmarks (posición guardada en tracks)

**Estadísticas**:
- 📊 Historial completo de reproducción
- 📈 Estadísticas de escucha por usuario
- 🎼 Contadores de reproducción por track/album/artist

**Metadata musical**:
- 🎤 Artistas, álbumes, tracks (indexados desde tu biblioteca)
- 🖼️ Rutas a covers extraídas de archivos
- 🎹 Géneros, años, duraciones
- 📝 Biografías de artistas (si fueron enriquecidas)
- 🌐 IDs de MusicBrainz

**Enlaces compartidos**:
- 🔗 Shares (enlaces públicos a playlists/albums)
- 📅 Fechas de expiración, contadores de visitas

---

## 🔄 Scripts de Backup

### 1. Hacer un Backup Completo

```bash
./scripts/backup-database.sh
```

**Qué hace:**
1. Crea dump binario de PostgreSQL (`.backup`)
2. Crea dump SQL plano (`.sql`) - más fácil de restaurar
3. Backup del volumen `echo-uploads` (covers, avatars)
4. Backup del volumen `echo-config` (JWT secrets)
5. Guarda info del sistema (versiones, contenedores)

**Ubicación del backup:**
```
./backups/backup_YYYY-MM-DD_HH-MM-SS/
├── postgres_dump.backup       # Dump binario (pg_restore)
├── postgres_dump.sql          # Dump SQL (psql -f)
├── uploads.tar.gz             # Covers y avatars
├── config.tar.gz              # JWT secrets
└── backup_info.txt            # Info del sistema
```

**Cuándo hacer backup:**
- 🔵 Antes de actualizar Echo Music Server
- 🔵 Antes de hacer `clean-rebuild.sh --delete-data`
- 🔵 Semanalmente (recomendado)
- 🔵 Antes de cambiar configuración crítica
- 🔵 Después de agregar muchas playlists/ratings

### 2. Restaurar un Backup

```bash
./scripts/restore-database.sh ./backups/backup_2024-01-15_10-30-00
```

**⚠️ ADVERTENCIA:** Esto sobrescribirá todos los datos actuales. El script pedirá confirmación.

**Qué restaura:**
1. Base de datos completa (usuarios, playlists, ratings, historial)
2. Uploads (covers descargadas, avatars)
3. Configuración (JWT secrets)
4. Reinicia servicios automáticamente

### 3. Clean Rebuild (MEJORADO)

```bash
# Rebuild sin borrar datos (SEGURO - recomendado)
./scripts/clean-rebuild.sh

# Rebuild borrando TODO (requiere confirmación)
./scripts/clean-rebuild.sh --delete-data
```

**Comportamiento:**
- **Sin flags**: Rebuilds Docker pero **MANTIENE** todos tus datos
- **Con --delete-data**: Requiere escribir "BORRAR TODO" para confirmar

---

## 🛡️ Estrategia de Backup Recomendada

### Para Uso Personal/Hogar

```bash
# Backup semanal (cron)
0 3 * * 0 /ruta/a/echo/scripts/backup-database.sh >> /var/log/echo-backup.log 2>&1
```

**Retención**: Mantener últimos 4 backups semanales (~4 semanas)

### Para Producción/Múltiples Usuarios

```bash
# Backup diario (cron)
0 2 * * * /ruta/a/echo/scripts/backup-database.sh >> /var/log/echo-backup.log 2>&1

# Limpieza de backups antiguos (mantener 30 días)
0 4 * * * find /ruta/a/echo/backups -name "backup_*" -mtime +30 -exec rm -rf {} \;
```

**Ubicación**: Copiar backups a:
- 💾 NAS (Synology, TrueNAS, etc.)
- ☁️ Cloud (Google Drive, Dropbox, AWS S3)
- 💿 Disco USB externo
- 🏢 Servidor de backups corporativo

### Ejemplo de script de backup automático a NAS:

```bash
#!/bin/bash
# /etc/cron.daily/echo-backup

cd /opt/echo-music-server
./scripts/backup-database.sh

# Copiar a NAS
LATEST_BACKUP=$(ls -1t backups/ | head -1)
rsync -az "backups/$LATEST_BACKUP" user@nas:/volume1/backups/echo/

# Limpiar backups locales antiguos (mantener 7 días)
find backups/ -name "backup_*" -mtime +7 -exec rm -rf {} \;
```

---

## 📋 Comandos Útiles

### Ver volúmenes y tamaños

```bash
# Listar volúmenes de Echo
docker volume ls | grep echo

# Ver tamaño de cada volumen
docker system df -v | grep echo
```

### Inspeccionar volumen

```bash
# Ver metadata del volumen
docker volume inspect echo-postgres-data

# Ver contenido del volumen (usando contenedor temporal)
docker run --rm -v echo-uploads:/data alpine ls -lah /data
```

### Backup manual de un volumen específico

```bash
# Backup de uploads
docker run --rm \
  -v echo-uploads:/source:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/uploads-manual.tar.gz -C /source .

# Restaurar uploads
docker run --rm \
  -v echo-uploads:/target \
  -v $(pwd):/backup:ro \
  alpine sh -c "rm -rf /target/* && tar xzf /backup/uploads-manual.tar.gz -C /target"
```

### Backup manual de PostgreSQL

```bash
# Dump completo
docker exec echo-postgres pg_dump -U music_admin -d music_server > backup.sql

# Restaurar
cat backup.sql | docker exec -i echo-postgres psql -U music_admin -d music_server
```

---

## 🚨 Escenarios de Desastre y Recuperación

### Escenario 1: Borré accidentalmente los volúmenes

```bash
# Si tienes un backup reciente:
./scripts/restore-database.sh ./backups/backup_YYYY-MM-DD_HH-MM-SS

# Si NO tienes backup:
# ❌ Los datos se perdieron permanentemente
# ✅ Solo se recreará el usuario admin con admin123
```

### Escenario 2: Corrupción de base de datos

```bash
# 1. Hacer backup del estado actual (por si acaso)
docker exec echo-postgres pg_dump -U music_admin -d music_server > corrupted_backup.sql

# 2. Restaurar desde backup bueno
./scripts/restore-database.sh ./backups/backup_YYYY-MM-DD_HH-MM-SS

# 3. Verificar integridad
docker exec echo-postgres psql -U music_admin -d music_server -c "SELECT COUNT(*) FROM users;"
```

### Escenario 3: Migrar a otro servidor

```bash
# En servidor VIEJO:
./scripts/backup-database.sh
scp -r backups/backup_YYYY-MM-DD_HH-MM-SS nuevo-servidor:/ruta/backups/

# En servidor NUEVO:
# 1. Instalar Echo Music Server
git clone https://github.com/tu-repo/echo-music-server.git
cd echo-music-server

# 2. Iniciar servicios (crear volúmenes vacíos)
docker compose -f docker-compose.simple.yml up -d

# 3. Restaurar backup del servidor viejo
./scripts/restore-database.sh /ruta/backups/backup_YYYY-MM-DD_HH-MM-SS
```

### Escenario 4: Actualizar a nueva versión de Echo

```bash
# 1. BACKUP OBLIGATORIO antes de actualizar
./scripts/backup-database.sh

# 2. Actualizar código
git pull origin main

# 3. Rebuild (sin borrar datos)
./scripts/clean-rebuild.sh

# 4. Verificar que todo funciona
# Si algo sale mal, restaurar backup:
# ./scripts/restore-database.sh ./backups/backup_YYYY-MM-DD_HH-MM-SS
```

---

## 💡 Mejores Prácticas

### ✅ HAZ ESTO

1. **Backup antes de cambios importantes**
   ```bash
   ./scripts/backup-database.sh
   ```

2. **Usa `clean-rebuild.sh` sin flags** (nunca uses `--delete-data` sin backup)

3. **Backups automáticos semanales** (cron job)

4. **Guarda backups fuera del servidor** (NAS, cloud, USB)

5. **Prueba tus backups ocasionalmente** (restaura en ambiente de prueba)

6. **Monitorea el tamaño de volúmenes**
   ```bash
   docker system df -v | grep echo
   ```

### ❌ NO HAGAS ESTO

1. ❌ **Nunca usar `docker-compose down -v`** sin backup previo

2. ❌ **No borrar volúmenes manualmente** sin entender qué contienen

3. ❌ **No guardar backups solo en el mismo servidor** (si falla el disco, pierdes todo)

4. ❌ **No ignorar errores de backup** (revisa logs regularmente)

5. ❌ **No asumir que Docker "guarda todo automáticamente"**

---

## 🔍 Verificar Estado de Volúmenes

```bash
# Script para verificar volúmenes
docker volume ls | grep echo | while read driver name; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Volume: $name"
    SIZE=$(docker system df -v | grep "$name" | awk '{print $3}')
    echo "💾 Size: $SIZE"
    MOUNTPOINT=$(docker volume inspect $name --format '{{.Mountpoint}}')
    echo "📁 Path: $MOUNTPOINT"
    echo ""
done
```

---

## 📞 Ayuda

Si algo sale mal:

1. **Revisa logs**:
   ```bash
   docker compose -f docker-compose.simple.yml logs -f echo-app
   docker compose -f docker-compose.simple.yml logs -f postgres
   ```

2. **Verifica estado de volúmenes**:
   ```bash
   docker volume ls | grep echo
   ```

3. **Restaura último backup conocido bueno**:
   ```bash
   ./scripts/restore-database.sh ./backups/backup_YYYY-MM-DD_HH-MM-SS
   ```

4. **GitHub Issues**: Si encuentras bugs relacionados con persistencia de datos

---

## 📊 Resumen Visual

```
┌─────────────────────────────────────────────────────┐
│ DATOS QUE SOBREVIVEN                                │
├─────────────────────────────────────────────────────┤
│ ✅ docker-compose restart                           │
│ ✅ docker-compose down (sin -v)                     │
│ ✅ docker-compose up --build                        │
│ ✅ ./scripts/clean-rebuild.sh (sin flags)          │
│ ✅ Actualizar imagen                                │
│ ✅ Reiniciar servidor host                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ DATOS QUE SE PIERDEN (sin backup)                   │
├─────────────────────────────────────────────────────┤
│ ❌ docker-compose down -v                           │
│ ❌ ./scripts/clean-rebuild.sh --delete-data        │
│ ❌ docker volume rm echo-postgres-data              │
│ ❌ docker volume prune                              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ PROTÉGETE CON BACKUPS                               │
├─────────────────────────────────────────────────────┤
│ 🔹 Backup semanal automático (cron)                │
│ 🔹 Backup manual antes de cambios                  │
│ 🔹 Guardar backups fuera del servidor              │
│ 🔹 Probar restauración ocasionalmente              │
└─────────────────────────────────────────────────────┘
```

**Última actualización**: 2024-01-15
