# 🌐 Nginx Setup para Echo Music Server

Esta guía es **OPCIONAL** y solo necesaria si quieres acceso desde Internet con HTTPS.

Para uso casero en red local, **NO necesitas Nginx**.

---

## 📋 ¿Cuándo usar Nginx?

### ✅ USA Nginx si:
- Quieres acceder desde fuera de tu red (Internet)
- Necesitas HTTPS/SSL
- Quieres un dominio personalizado (`music.tudominio.com`)
- Quieres múltiples servicios en el mismo servidor (ej: Jellyfin + Echo)

### ❌ NO uses Nginx si:
- Solo accedes desde tu red local
- No tienes un dominio
- Quieres simplicidad (acceso directo)

---

## 🚀 Instalación Completa

### Paso 1: Instalar Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# Verificar instalación
sudo systemctl status nginx
```

### Paso 2: Configurar Echo en Nginx

```bash
# Copiar archivo de configuración
sudo cp nginx/echo.conf /etc/nginx/sites-available/echo

# Editar y cambiar tu dominio
sudo nano /etc/nginx/sites-available/echo
# ⚠️ Cambiar "music.tudominio.com" por tu dominio real

# Habilitar el sitio
sudo ln -s /etc/nginx/sites-available/echo /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Si todo OK, recargar Nginx
sudo systemctl reload nginx
```

### Paso 3: Configurar Firewall

```bash
# Permitir HTTP y HTTPS
sudo ufw allow 'Nginx Full'

# Verificar
sudo ufw status
```

### Paso 4: Instalar Certificado SSL (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado SSL (AUTOMÁTICO)
sudo certbot --nginx -d music.tudominio.com

# Seguir instrucciones en pantalla:
# - Ingresar email
# - Aceptar términos
# - Elegir "Redirect HTTP to HTTPS" (opción 2)
```

### Paso 5: Renovación Automática de SSL

```bash
# Certbot ya crea un cronjob automáticamente
# Verificar que funcione:
sudo certbot renew --dry-run

# Si funciona, verás:
# Congratulations, all simulated renewals succeeded
```

### Paso 6: Actualizar CORS en Echo

Edita tu `.env`:
```env
# Agregar tu dominio HTTPS
CORS_ORIGINS=http://localhost:4567,https://music.tudominio.com
```

Reinicia Echo:
```bash
docker compose restart echo-app
```

---

## 🔧 Configuración de Red

### Opción A: Puerto Forwarding (Router Casero)

Si tienes servidor en casa y quieres acceso desde Internet:

1. **Accede a tu router** (ej: `192.168.1.1`)
2. **Busca "Port Forwarding" o "NAT"**
3. **Configura:**
   - Servicio: Echo Music Server
   - Puerto Externo: 443 (HTTPS)
   - Puerto Interno: 443
   - IP Interna: IP de tu servidor (ej: 192.168.1.100)
   - Protocolo: TCP

4. **Repite para puerto 80 (HTTP)**
   - Necesario para renovación de certificados

5. **DNS Dinámico** (si tu IP pública cambia)
   ```bash
   # Usar servicios como:
   # - DuckDNS (gratis)
   # - No-IP (gratis)
   # - Cloudflare (gratis)
   ```

### Opción B: Cloudflare Tunnel (Sin Port Forwarding)

Alternativa sin necesidad de abrir puertos:

```bash
# Instalar Cloudflare Tunnel
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Autenticar
cloudflared tunnel login

# Crear tunnel
cloudflared tunnel create echo-music

# Configurar
cloudflared tunnel route dns echo-music music.tudominio.com

# Iniciar tunnel
cloudflared tunnel run echo-music
```

---

## 📊 Verificación

### 1. Verificar Nginx
```bash
# Ver logs
sudo tail -f /var/log/nginx/echo_access.log

# Verificar configuración
sudo nginx -t

# Ver status
sudo systemctl status nginx
```

### 2. Verificar SSL
```bash
# Verificar certificado SSL
sudo certbot certificates

# Test renovación
sudo certbot renew --dry-run
```

### 3. Test desde navegador
```bash
# Debe redirigir automáticamente a HTTPS
http://music.tudominio.com

# Debe mostrar candado verde 🔒
https://music.tudominio.com
```

### 4. Test SSL (online)
- https://www.ssllabs.com/ssltest/
- Debe dar calificación A o A+

---

## 🐛 Troubleshooting

### Error: "502 Bad Gateway"

```bash
# Verificar que Echo esté corriendo
docker compose ps

# Ver logs de Echo
docker compose logs echo-app

# Verificar que Nginx puede conectar a localhost:4567
curl http://localhost:4567/health
```

### Error: "SSL Certificate Not Found"

```bash
# Verificar que Certbot corrió exitosamente
sudo certbot certificates

# Re-generar certificado
sudo certbot --nginx -d music.tudominio.com --force-renewal
```

### Error: "WebSocket connection failed"

Verifica que la configuración de Nginx incluye:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### Error: CORS bloqueado

Agrega tu dominio HTTPS en `.env`:
```env
CORS_ORIGINS=https://music.tudominio.com
```

---

## 📈 Optimizaciones Avanzadas

### 1. Habilitar HTTP/2

Ya está habilitado en la configuración:
```nginx
listen 443 ssl http2;
```

### 2. Compression (Gzip)

Agregar a `/etc/nginx/nginx.conf`:
```nginx
http {
    # Gzip Settings
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss;
}
```

### 3. Rate Limiting

Agregar a configuración de Echo:
```nginx
# Antes del bloque server
limit_req_zone $binary_remote_addr zone=echo_limit:10m rate=10r/s;

# Dentro de location /
location / {
    limit_req zone=echo_limit burst=20 nodelay;
    # ... resto de configuración
}
```

### 4. IP Whitelist (acceso solo desde ciertas IPs)

```nginx
# Solo permitir tu IP
location / {
    allow 123.123.123.123;  # Tu IP
    deny all;

    # ... resto de configuración
}
```

---

## 🔄 Múltiples Servicios (Jellyfin + Echo)

Si también tienes Jellyfin u otros servicios:

```nginx
# Jellyfin en jellyfin.tudominio.com -> localhost:8096
# Echo en music.tudominio.com -> localhost:4567

# Crear archivos separados:
# /etc/nginx/sites-available/jellyfin
# /etc/nginx/sites-available/echo

# Habilitar ambos
sudo ln -s /etc/nginx/sites-available/jellyfin /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/echo /etc/nginx/sites-enabled/
```

---

## 🔒 Seguridad Adicional

### 1. Fail2Ban (prevenir ataques de fuerza bruta)

```bash
# Instalar Fail2Ban
sudo apt install fail2ban

# Crear filtro para Echo
sudo nano /etc/fail2ban/filter.d/echo.conf
```

Contenido:
```ini
[Definition]
failregex = ^<HOST> .* "(POST|GET) /(api/auth/login|api/auth/refresh)" .*" 401
ignoreregex =
```

Habilitar:
```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[echo]
enabled = true
port = http,https
filter = echo
logpath = /var/log/nginx/echo_access.log
maxretry = 5
bantime = 3600
```

### 2. Autenticación HTTP Básica (opcional)

```bash
# Crear usuario
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd usuario

# Agregar a Nginx
location / {
    auth_basic "Echo Music Server";
    auth_basic_user_file /etc/nginx/.htpasswd;
    # ... resto de configuración
}
```

---

## 📝 Resumen de Arquitectura

### Sin Nginx (Red Local)
```
[Cliente en red local]
         ↓
   http://192.168.1.100:4567
         ↓
   [Docker: Echo App]
```

### Con Nginx (Internet)
```
[Cliente en Internet]
         ↓
   https://music.tudominio.com:443
         ↓
   [Nginx con SSL]
         ↓
   http://localhost:4567
         ↓
   [Docker: Echo App]
```

---

## 🎯 Recomendación Final

**Para servidor casero (LAN):**
- ❌ NO uses Nginx
- ✅ Acceso directo: `http://IP_LOCAL:4567`

**Para acceso desde Internet:**
- ✅ Usa Nginx + Let's Encrypt
- ✅ Configura port forwarding o Cloudflare Tunnel
- ✅ Mantén firewall activo

---

## 📞 Recursos Adicionales

- **Nginx Docs:** https://nginx.org/en/docs/
- **Let's Encrypt:** https://letsencrypt.org/
- **Cloudflare Tunnel:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Certbot:** https://certbot.eff.org/

---

**¿Preguntas?** Abre un issue en GitHub: https://github.com/Alexzafra13/echo/issues
