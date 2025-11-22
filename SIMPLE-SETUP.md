# 🚀 Echo Music Server - Setup Más Simple

## Opción 1: Sin archivo .env (más fácil)

### 1. Edita `docker-compose.jellyfin-style.yml`

Cambia la línea 54 a tu carpeta de música:
```yaml
- /mnt/navidrome/musica:/music:ro  # <-- Cambia esto
```

### 2. Arranca Echo

```bash
docker compose -f docker-compose.jellyfin-style.yml up -d
```

### 3. Abre tu navegador

http://localhost:4567

Login: `admin` / `admin123`

**¡Listo!** 🎉

---

## Opción 2: Con archivo .env (más flexible)

### 1. Crea archivo `.env`

```bash
cat > .env << 'EOF'
MUSIC_PATH=/mnt/navidrome/musica
EOF
```

### 2. Arranca Echo

```bash
docker compose -f docker-compose.jellyfin-style.yml up -d
```

### 3. Abre tu navegador

http://localhost:4567

**¡Listo!** 🎉

---

## Opciones avanzadas (todas opcionales)

Si quieres personalizar más, añade a tu `.env`:

```bash
# Puerto diferente
APP_PORT=8080

# Versión específica de la imagen
VERSION=v1.2.3
```

---

## ¿Qué se auto-configura?

✅ **Base de datos PostgreSQL** - Se crea automáticamente
✅ **Cache Redis** - Se crea automáticamente
✅ **JWT Secrets** - Se generan automáticamente de forma segura
✅ **Usuario admin** - Se crea automáticamente (admin/admin123)
✅ **Settings por defecto** - Se inicializan automáticamente

**Solo necesitas decir dónde está tu música.** Todo lo demás es automático.

---

## Primer escaneo

1. Login en http://localhost:4567
2. Ve a **Settings** ⚙️
3. Click en **Library Scanner**
4. Click **Start Scan**
5. Espera a que termine
6. ¡Disfruta tu música! 🎵

---

## Troubleshooting

### ¿No encuentra tu música?

Verifica que el path existe:
```bash
ls -la /mnt/navidrome/musica
```

Verifica que Echo puede ver tu música:
```bash
docker exec echo-app ls -la /music
```

### Ver logs

```bash
docker logs echo-app -f
```

### Verificar base de datos

```bash
./check-database.sh
```

### Reiniciar todo

```bash
docker compose -f docker-compose.jellyfin-style.yml restart
```

### Eliminar todo y empezar de cero

```bash
docker compose -f docker-compose.jellyfin-style.yml down -v
# Tus archivos de música están seguros (read-only)
```

---

**Hecho con ❤️ - Tan simple como Jellyfin**
