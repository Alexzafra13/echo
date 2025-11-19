# 🚫 Puertos 80/443 Bloqueados - Soluciones

## Problema Común con ISPs Residenciales

Muchos ISPs (especialmente **Digi España**, Jazztel, MásMóvil) **bloquean puertos 80 y 443** en conexiones residenciales.

**¿Por qué?**
- Evitar que clientes residenciales monten servidores
- Forzar upgrade a conexión empresarial
- Seguridad (evitar botnets)

**¿Cómo saber si tengo bloqueados los puertos?**

```bash
# Test desde FUERA de tu red (usar un móvil con 4G/5G)
# O desde: https://www.yougetsignal.com/tools/open-ports/

# Resultado:
# Puerto 80: Cerrado ❌
# Puerto 443: Cerrado ❌
```

---

## ✅ **SOLUCIONES (Sin puertos 80/443)**

### 🥇 **Solución 1: Cloudflare Tunnel** (MEJOR OPCIÓN - Gratis)

**Ventajas:**
- ✅ **NO necesita puertos 80/443**
- ✅ Funciona con CGNAT
- ✅ HTTPS automático
- ✅ Gratis sin límites
- ✅ DDoS protection

Esta es **LA SOLUCIÓN PERFECTA** para Digi u otros ISPs con puertos bloqueados.

#### Setup completo:

##### 1. Instalar cloudflared

```bash
# En tu servidor
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
cloudflared --version
```

##### 2. Crear cuenta en Cloudflare

```
1. Ir a https://dash.cloudflare.com/sign-up
2. Crear cuenta gratis
3. Agregar dominio (o usar uno gratis de Freenom/DuckDNS)
```

##### 3. Autenticar cloudflared

```bash
cloudflared tunnel login
# Se abrirá navegador
# Autorizar acceso
```

##### 4. Crear tunnel

```bash
cloudflared tunnel create echo-music
```

Verás algo como:
```
Tunnel credentials written to /root/.cloudflared/abc123-xyz.json
Created tunnel echo-music with id abc123-xyz
```

##### 5. Configurar tunnel

```bash
# Crear archivo de configuración
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

**Contenido del archivo:**

```yaml
tunnel: abc123-xyz  # ⚠️ Reemplazar con TU tunnel ID
credentials-file: /root/.cloudflared/abc123-xyz.json  # ⚠️ Reemplazar con TU archivo

ingress:
  # Echo Music Server
  - hostname: music.tudominio.com  # ⚠️ Tu dominio
    service: http://localhost:4567
    originRequest:
      # WebSocket support (CRÍTICO para Echo)
      noTLSVerify: true
      connectTimeout: 30s
      keepAliveTimeout: 90s
      tcpKeepAlive: 30s
      # Streaming optimizations
      disableChunkedEncoding: true
      http2Origin: false

  # Health check endpoint
  - hostname: music.tudominio.com
    path: /health
    service: http://localhost:4567

  # Catch-all
  - service: http_status:404
```

##### 6. Configurar DNS en Cloudflare

```bash
# Esto crea el registro DNS automáticamente
cloudflared tunnel route dns echo-music music.tudominio.com
```

##### 7. Instalar como servicio (permanente)

```bash
# Instalar servicio systemd
sudo cloudflared service install

# Iniciar servicio
sudo systemctl start cloudflared

# Habilitar en arranque
sudo systemctl enable cloudflared

# Verificar estado
sudo systemctl status cloudflared
```

##### 8. Configurar CORS en Echo

Edita `.env`:
```env
CORS_ORIGINS=https://music.tudominio.com
```

Reinicia Echo:
```bash
docker compose restart echo-app
```

##### 9. Verificar

```bash
# Ver logs del tunnel
sudo journalctl -u cloudflared -f

# Acceder desde navegador
https://music.tudominio.com
```

**¡Listo!** No necesitas puertos 80/443 abiertos ✅

---

### 🥈 **Solución 2: Puerto Alternativo + Nginx** (Si tienes IP pública)

Si tienes IP pública pero puertos 80/443 bloqueados, puedes usar **puerto alternativo**.

**Problema:** Let's Encrypt REQUIERE puerto 80 para validación HTTP-01.

**Solución:** Usar validación DNS-01 (sin puerto 80).

#### Setup con Certbot DNS Challenge:

##### 1. Instalar Certbot con plugin DNS

```bash
# Para Cloudflare DNS
sudo apt install certbot python3-certbot-dns-cloudflare

# Para otros (ver https://eff-certbot.readthedocs.io/en/stable/using.html#dns-plugins)
# - Google Cloud DNS
# - AWS Route53
# - DigitalOcean
# etc.
```

##### 2. Configurar credenciales DNS

```bash
# Cloudflare API token
nano ~/.secrets/cloudflare.ini
```

```ini
# Cloudflare API token
dns_cloudflare_api_token = tu_token_aqui
```

```bash
chmod 600 ~/.secrets/cloudflare.ini
```

##### 3. Generar certificado (sin puerto 80)

```bash
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d music.tudominio.com
```

##### 4. Usar puerto alternativo

Editar `docker-compose.production.yml`:

```yaml
nginx:
  ports:
    - "8443:443"  # Puerto alternativo
    # NO expongas puerto 80
```

##### 5. Acceder

```
https://music.tudominio.com:8443
```

**Desventajas:**
- ❌ Tienes que poner `:8443` en la URL
- ❌ Menos profesional
- ❌ Algunos navegadores pueden quejarse

---

### 🥉 **Solución 3: Tailscale** (Solo acceso personal)

Si solo quieres acceso para ti y tu familia (no público):

```bash
# Instalar Tailscale en servidor
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Instalar app en tus dispositivos
# Android/iOS: App Store/Google Play
# Windows/Mac: tailscale.com/download

# Acceder
http://nombre-del-servidor:4567
```

**Ventajas:**
- ✅ No necesita puertos abiertos
- ✅ No necesita dominio
- ✅ Gratis (hasta 100 dispositivos)
- ✅ Cifrado end-to-end

**Desventajas:**
- ❌ Solo para ti (no público)
- ❌ Cada dispositivo necesita Tailscale

---

### 🥉 **Solución 4: VPS como Proxy** ($3-5/mes)

Alquilar un VPS barato que SÍ tenga puertos 80/443 abiertos.

**Arquitectura:**
```
Internet → VPS (puertos 80/443) → Tunnel SSH → Tu servidor Digi
```

#### Proveedores baratos:
- **Hetzner:** €3.79/mes
- **Contabo:** €4/mes
- **Vultr:** $2.50/mes

#### Setup:

##### En el VPS:

```bash
# Instalar Nginx
sudo apt install nginx certbot python3-certbot-nginx

# Configurar Nginx (proxy a localhost:8080)
sudo nano /etc/nginx/sites-available/echo
```

```nginx
server {
    listen 80;
    server_name music.tudominio.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/echo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d music.tudominio.com
```

##### En tu servidor (Digi):

```bash
# Crear tunnel SSH permanente
sudo apt install autossh

# Crear servicio
sudo nano /etc/systemd/system/echo-tunnel.service
```

```ini
[Unit]
Description=Echo Music Reverse Tunnel
After=network.target

[Service]
User=tu_usuario
ExecStart=/usr/bin/autossh -M 0 -N -R 8080:localhost:4567 user@IP_VPS -o "ServerAliveInterval=30" -o "ServerAliveCountMax=3"
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable echo-tunnel
sudo systemctl start echo-tunnel
```

---

## 🎯 **Recomendación para Digi**

### Mejor opción: **Cloudflare Tunnel**

**Por qué:**
1. ✅ Gratis
2. ✅ No necesita puertos 80/443
3. ✅ HTTPS automático
4. ✅ Funciona con CGNAT (si Digi te da CGNAT)
5. ✅ Setup en 20 minutos
6. ✅ WebSocket funciona perfectamente

**Alternativa económica:** VPS proxy ($3-5/mes)

---

## 📊 **Comparación Rápida**

| Solución | Costo | Puertos 80/443 | Complejidad | Público |
|----------|-------|----------------|-------------|---------|
| **Cloudflare Tunnel** | Gratis | ❌ No necesita | ⭐⭐ Media | ✅ |
| Puerto alternativo (8443) | Gratis | ⚠️ Solo 443 | ⭐⭐ Media | ⚠️ Con :8443 |
| **Tailscale** | Gratis | ❌ No necesita | ⭐ Fácil | ❌ |
| **VPS Proxy** | $3-5/mes | ✅ En VPS | ⭐⭐⭐ Alta | ✅ |

---

## 🐛 **Troubleshooting Digi**

### Verificar si puertos están bloqueados:

```bash
# Desde FUERA de tu red (móvil con datos)
# Usar: https://www.yougetsignal.com/tools/open-ports/

# O con nmap (desde otro servidor)
nmap -p 80,443,8080 TU_IP_PUBLICA
```

### Error: "No puedo validar certificado SSL"

- Digi bloquea puerto 80 → Usar Cloudflare Tunnel
- O usar validación DNS-01 con Certbot

### Error: "Tunnel no conecta"

```bash
# Ver logs
sudo journalctl -u cloudflared -f

# Verificar que Echo esté corriendo
docker compose ps
curl http://localhost:4567/health

# Reiniciar tunnel
sudo systemctl restart cloudflared
```

---

## 💡 **Caso Específico: Digi España**

**Características de Digi:**
- ✅ Fibra rápida
- ❌ Puertos 80/443 bloqueados
- ❌ CGNAT en algunas zonas
- ❌ No dan IP pública estática sin pagar extra

**Mejor solución para Digi:**

```bash
# Opción 1: Cloudflare Tunnel (RECOMENDADO)
# - No necesita puertos
# - No necesita IP pública
# - Gratis
# Ver pasos arriba

# Opción 2: Pedir IP pública + usar puerto 8443
# Llamar a Digi: 1444
# Pedir "IP pública estática"
# Puede costar ~5€/mes extra
# Luego usar puerto 8443 con DNS challenge
```

---

## 📞 **Recursos Adicionales**

- **Cloudflare Tunnel Docs:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Certbot DNS Plugins:** https://eff-certbot.readthedocs.io/en/stable/using.html#dns-plugins
- **Tailscale:** https://tailscale.com/kb/

---

**Para usuarios de Digi: Cloudflare Tunnel es la solución perfecta** 🎯
