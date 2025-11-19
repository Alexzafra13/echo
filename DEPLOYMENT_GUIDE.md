# 🚀 Guía de Despliegue - Echo Music Server

Esta guía te ayuda a elegir el método correcto según tu caso de uso.

---

## 📋 **Resumen Rápido**

| Caso de uso | Archivo a usar | Complejidad | CGNAT OK? |
|-------------|----------------|-------------|-----------|
| **Red local (casa)** | `docker-compose.yml` | ⭐ Fácil | ✅ |
| **Internet (IP pública)** | `docker-compose.production.yml` | ⭐⭐ Media | ✅ |
| **Internet (CGNAT)** | Ver `CGNAT_SOLUTIONS.md` | ⭐⭐⭐ Avanzada | ✅ |

---

## 🏠 **Opción 1: Red Local (Servidor Casero)**

**Ideal para:**
- Acceso solo desde tu WiFi de casa
- No necesitas acceso desde Internet
- Setup más simple

**Ventajas:**
- ✅ No necesitas dominio
- ✅ No necesitas SSL/HTTPS
- ✅ No necesitas Nginx
- ✅ Configuración en 1 minuto

**Desventajas:**
- ❌ Solo accesible en tu red local

### Instalación:

```bash
# 1. Clonar el repositorio
git clone https://github.com/Alexzafra13/echo.git
cd echo

# 2. (Opcional) Configurar ruta de música
cp .env.example .env
nano .env  # Editar MUSIC_PATH

# 3. Desplegar
docker compose up -d

# 4. Ver logs para encontrar IP de red
docker compose logs echo-app | grep "Network:"

# Ejemplo de salida:
# Network:  http://192.168.1.100:4567
```

### Acceder:

- **Desde el mismo servidor:** `http://localhost:4567`
- **Desde móvil/PC en la misma red:** `http://192.168.1.X:4567` (IP mostrada en logs)

### Usuarios:
- Usuario: `admin`
- Contraseña: `admin123` (cámbiala en primer login)

---

## 🌐 **Opción 2: Internet (Con IP Pública)**

**Ideal para:**
- Acceso desde cualquier lugar (trabajo, vacaciones, etc.)
- Compartir con amigos/familia
- Tienes IP pública (sin CGNAT)

**Ventajas:**
- ✅ Acceso desde cualquier lugar
- ✅ HTTPS automático
- ✅ Dominio personalizado

**Desventajas:**
- ❌ Necesitas dominio
- ❌ Necesitas configurar router (port forwarding)
- ❌ Más complejo

### Pre-requisitos:

1. **Dominio** (ej: `music.tudominio.com`)
   - Gratis: [Freenom](https://www.freenom.com/), [DuckDNS](https://www.duckdns.org/)
   - Pago: Namecheap, Cloudflare, GoDaddy

2. **IP Pública** (verificar que NO tienes CGNAT)
   ```bash
   # Tu IP pública
   curl https://api.ipify.org

   # IP del router (acceder a http://192.168.1.1)
   # Si coinciden → OK ✅
   # Si NO coinciden → Tienes CGNAT ❌ (Ver Opción 3)
   ```

3. **Puertos abiertos en firewall**
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

4. **Port Forwarding en router**
   - Puerto 80 (HTTP) → IP del servidor
   - Puerto 443 (HTTPS) → IP del servidor

### Instalación:

```bash
# 1. Clonar el repositorio
git clone https://github.com/Alexzafra13/echo.git
cd echo

# 2. Configurar dominio
cp .env.example .env
nano .env

# Agregar:
# DOMAIN=music.tudominio.com
# SSL_EMAIL=tu@email.com
# MUSIC_PATH=/ruta/a/tu/musica
```

```bash
# 3. Configurar DNS
# En tu proveedor de dominio (Cloudflare, Namecheap, etc.)
# Crear registro A:
#   Nombre: music (o @ para raíz)
#   Tipo: A
#   Valor: TU_IP_PUBLICA (de curl https://api.ipify.org)
#   TTL: Auto o 300
```

```bash
# 4. Generar certificado SSL
chmod +x scripts/init-ssl.sh
./scripts/init-ssl.sh

# Esto:
# - Verifica que tu dominio apunte correctamente
# - Genera certificado SSL con Let's Encrypt
# - Configura renovación automática
```

```bash
# 5. Desplegar con Nginx + SSL
docker compose -f docker-compose.production.yml up -d

# 6. Verificar
curl https://music.tudominio.com/health
```

### Acceder:

- **URL:** `https://music.tudominio.com`
- **Usuarios:** admin / admin123 (cambiar en primer login)

### Mantenimiento:

```bash
# Ver logs
docker compose -f docker-compose.production.yml logs -f

# Ver renovación de SSL
docker compose -f docker-compose.production.yml logs certbot

# Reiniciar
docker compose -f docker-compose.production.yml restart

# Detener
docker compose -f docker-compose.production.yml down
```

---

## 🔒 **Opción 3: Internet (Con CGNAT)**

**Si tienes CGNAT** (tu ISP te da IP privada), **NO puedes hacer port forwarding**.

### Soluciones:

Ver guía completa: **[CGNAT_SOLUTIONS.md](CGNAT_SOLUTIONS.md)**

#### Resumen de opciones:

1. **Cloudflare Tunnel** (RECOMENDADO - Gratis)
   - No necesitas IP pública
   - No necesitas abrir puertos
   - HTTPS automático
   - Ver guía completa en CGNAT_SOLUTIONS.md

2. **Tailscale** (Solo para acceso personal)
   - VPN mesh privada
   - Solo tú y tus dispositivos
   - Muy fácil de configurar

3. **VPS + Reverse Tunnel** ($3-5/mes)
   - Control total
   - IP pública dedicada

4. **Pedir IP Pública al ISP**
   - Puede costar $5-15/mes extra
   - No todos los ISP lo ofrecen

---

## 🎯 **Árbol de Decisión**

```
¿Cómo quieres acceder a Echo?
│
├─ Solo desde mi WiFi de casa
│  └─ Usa: docker-compose.yml
│     └─ Ver: Opción 1 (arriba)
│
└─ Desde Internet (fuera de casa)
   │
   ├─ ¿Tienes IP pública? (comprobar arriba)
   │  │
   │  ├─ SÍ → Usa: docker-compose.production.yml
   │  │       └─ Ver: Opción 2 (arriba)
   │  │
   │  └─ NO (CGNAT) → Ver: CGNAT_SOLUTIONS.md
   │                  └─ Recomendación: Cloudflare Tunnel
   │
   └─ ¿Solo para mí y mi familia?
      └─ Considera: Tailscale (más fácil)
         └─ Ver: CGNAT_SOLUTIONS.md
```

---

## 📊 **Comparación de Métodos**

| Característica | Red Local | Internet (IP pública) | Internet (CGNAT) |
|----------------|-----------|----------------------|-----------------|
| **Complejidad** | ⭐ Fácil | ⭐⭐ Media | ⭐⭐⭐ Avanzada |
| **Costo** | Gratis | Gratis | Gratis (Cloudflare/Tailscale) |
| **Dominio necesario** | ❌ | ✅ | ✅ (Cloudflare Tunnel) |
| **SSL/HTTPS** | ❌ | ✅ Auto | ✅ Auto (Cloudflare) |
| **Port Forwarding** | ❌ | ✅ | ❌ |
| **Acceso desde fuera** | ❌ | ✅ | ✅ |
| **Setup time** | 5 min | 30 min | 20 min (Cloudflare) |

---

## 🔧 **Configuración Avanzada**

### Cambiar puerto (Red Local):

```env
# En .env
APP_PORT=8080
```

```bash
# Reiniciar
docker compose restart echo-app

# Acceder en: http://localhost:8080
```

### Múltiples dominios (Internet):

```env
# En .env
CORS_ORIGINS=https://music.domain1.com,https://music.domain2.com
```

### Biblioteca de música en NAS:

```env
# En .env
MUSIC_PATH=/mnt/nas/music
```

```bash
# Montar NAS primero
sudo mount -t nfs nas.local:/music /mnt/nas/music
```

### Reverse Proxy existente (ya tienes Nginx):

Si ya tienes Nginx corriendo, NO uses `docker-compose.production.yml`.

Usa `docker-compose.yml` y configura Nginx manualmente:

```nginx
# /etc/nginx/sites-available/echo
server {
    listen 443 ssl http2;
    server_name music.tudominio.com;

    ssl_certificate /etc/letsencrypt/live/music.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/music.tudominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:4567;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🐛 **Troubleshooting**

### No puedo acceder desde mi móvil (Red Local)

1. Verificar que estés en la misma WiFi
2. Verificar IP del servidor:
   ```bash
   docker compose logs echo-app | grep "Network:"
   ```
3. Verificar firewall del servidor:
   ```bash
   sudo ufw allow 4567/tcp
   ```

### Error: "502 Bad Gateway" (Internet)

1. Verificar que Echo esté corriendo:
   ```bash
   docker compose ps
   curl http://localhost:4567/health
   ```

2. Ver logs de Nginx:
   ```bash
   docker compose -f docker-compose.production.yml logs nginx
   ```

### Error: "SSL Certificate Not Found"

1. Ejecutar script de SSL:
   ```bash
   ./scripts/init-ssl.sh
   ```

2. Verificar que dominio apunte correctamente:
   ```bash
   dig music.tudominio.com
   ```

### Error: "WebSocket connection failed"

Verificar configuración de proxy:
- Nginx debe tener: `proxy_set_header Upgrade $http_upgrade;`
- Cloudflare Tunnel: Ver configuración en CGNAT_SOLUTIONS.md

---

## 📚 **Documentación Adicional**

- **[PRODUCTION.md](PRODUCTION.md)** - Guía general de producción
- **[NGINX_SETUP.md](NGINX_SETUP.md)** - Configuración manual de Nginx
- **[CGNAT_SOLUTIONS.md](CGNAT_SOLUTIONS.md)** - Soluciones para CGNAT
- **[DOCKER.md](DOCKER.md)** - Guía de Docker
- **[README.md](README.md)** - Información general del proyecto

---

## 🆘 **Ayuda**

- **Issues:** https://github.com/Alexzafra13/echo/issues
- **Discusiones:** https://github.com/Alexzafra13/echo/discussions

---

**¡Disfruta de tu servidor Echo Music!** 🎵
