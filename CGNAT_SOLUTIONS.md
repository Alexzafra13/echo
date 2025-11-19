# 🌐 Soluciones para CGNAT - Echo Music Server

## ¿Qué es CGNAT?

**CGNAT (Carrier-Grade NAT)** es cuando tu proveedor de Internet (ISP) te asigna una **IP privada** en lugar de una IP pública.

**Problema:** NO puedes hacer port forwarding porque **no tienes una IP pública real**.

---

## 🔍 ¿Tengo CGNAT?

### Test rápido:

```bash
# 1. Ver tu IP pública (desde Internet)
curl https://api.ipify.org

# 2. Ver tu IP del router
# Accede a tu router (ej: 192.168.1.1)
# Busca "WAN IP" o "IP pública"

# Si las IPs NO coinciden → Tienes CGNAT ❌
# Si las IPs coinciden → NO tienes CGNAT ✅
```

### Rangos CGNAT comunes:
- `100.64.0.0` - `100.127.255.255`
- `10.x.x.x`
- `172.16.x.x` - `172.31.x.x`
- `192.168.x.x`

Si tu router muestra una IP en estos rangos → **Tienes CGNAT**

---

## ✅ **Soluciones para CGNAT**

### 🥇 **Opción 1: Cloudflare Tunnel** (RECOMENDADA - GRATIS)

**Ventajas:**
- ✅ Completamente gratis
- ✅ No necesitas IP pública
- ✅ No necesitas abrir puertos
- ✅ SSL/HTTPS automático
- ✅ Protección DDoS incluida
- ✅ Fácil de configurar

**Desventajas:**
- ❌ Requiere dominio (gratis en Cloudflare)
- ❌ Todo el tráfico pasa por Cloudflare

#### Instalación:

##### Paso 1: Crear cuenta en Cloudflare

1. Ir a https://www.cloudflare.com/
2. Crear cuenta gratis
3. Agregar tu dominio (o registrar uno gratis en freenom.com)

##### Paso 2: Instalar cloudflared en tu servidor

```bash
# Ubuntu/Debian
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Verificar instalación
cloudflared --version
```

##### Paso 3: Autenticar

```bash
# Esto abrirá navegador para autorizar
cloudflared tunnel login
```

##### Paso 4: Crear tunnel

```bash
# Crear tunnel
cloudflared tunnel create echo-music

# Esto generará un archivo de credenciales
# Copiar el UUID que aparece
```

##### Paso 5: Configurar tunnel

Crear archivo `~/.cloudflared/config.yml`:

```yaml
tunnel: <TU_TUNNEL_UUID>
credentials-file: /root/.cloudflared/<TU_TUNNEL_UUID>.json

ingress:
  # Echo Music Server
  - hostname: music.tudominio.com
    service: http://localhost:4567
    originRequest:
      noTLSVerify: true
      # WebSocket support (CRÍTICO para Echo)
      connectTimeout: 30s
      keepAliveTimeout: 30s

  # Catch-all rule
  - service: http_status:404
```

##### Paso 6: Crear DNS en Cloudflare

```bash
# Esto crea el registro DNS automáticamente
cloudflared tunnel route dns echo-music music.tudominio.com
```

##### Paso 7: Iniciar tunnel

```bash
# Iniciar manualmente (para testing)
cloudflared tunnel run echo-music

# Si funciona, instalar como servicio
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

##### Paso 8: Configurar CORS en Echo

Edita `.env`:
```env
CORS_ORIGINS=https://music.tudominio.com
```

Reinicia Echo:
```bash
docker compose restart echo-app
```

##### Verificar:
```bash
# Ver logs del tunnel
sudo journalctl -u cloudflared -f

# Acceder desde navegador
https://music.tudominio.com
```

---

### 🥈 **Opción 2: Tailscale** (GRATIS - VPN Mesh)

**Ventajas:**
- ✅ Completamente gratis (hasta 100 dispositivos)
- ✅ No necesitas IP pública
- ✅ No necesitas dominio
- ✅ Cifrado end-to-end
- ✅ Muy fácil de configurar
- ✅ Acceso desde cualquier dispositivo

**Desventajas:**
- ❌ Solo tú y tus dispositivos (no público)
- ❌ Cada dispositivo necesita Tailscale instalado

**Ideal para:** Acceso personal desde múltiples dispositivos (móvil, laptop, etc.)

#### Instalación:

##### En el servidor:

```bash
# Instalar Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Conectar
sudo tailscale up

# Ver IP de Tailscale
tailscale ip -4
# Ejemplo: 100.101.102.103
```

##### En tus dispositivos (móvil, laptop):

1. Instalar app de Tailscale
   - Android: Google Play Store
   - iOS: App Store
   - Windows/Mac/Linux: https://tailscale.com/download

2. Iniciar sesión con la misma cuenta

3. Acceder a Echo usando la IP de Tailscale:
   ```
   http://100.101.102.103:4567
   ```

##### Configurar nombre fácil:

```bash
# En Tailscale dashboard (https://login.tailscale.com/admin/machines)
# Renombrar tu servidor a: echo-music

# Ahora puedes acceder con:
http://echo-music:4567
```

---

### 🥉 **Opción 3: Ngrok** (Gratis limitado)

**Ventajas:**
- ✅ Muy fácil de configurar (1 comando)
- ✅ No necesitas IP pública
- ✅ HTTPS automático

**Desventajas:**
- ❌ URL aleatoria (ej: `abc123.ngrok.io`)
- ❌ La URL cambia cada vez que reinicias
- ❌ Límite de 40 conexiones/min (gratis)
- ❌ Plan pago para dominio personalizado ($8/mes)

**Ideal para:** Testing temporal

#### Instalación:

```bash
# Instalar ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update
sudo apt install ngrok

# Autenticar (necesitas cuenta gratis en ngrok.com)
ngrok config add-authtoken <TU_TOKEN>

# Iniciar tunnel
ngrok http 4567

# Verás una URL como: https://abc123.ngrok.io
```

---

### 🥉 **Opción 4: VPS + Reverse Tunnel**

**Ventajas:**
- ✅ Control total
- ✅ IP pública dedicada
- ✅ Sin limitaciones

**Desventajas:**
- ❌ Cuesta dinero ($3-5/mes)
- ❌ Configuración más compleja

**Ideal para:** Producción seria

#### Proveedores baratos:
- **Hetzner Cloud:** €3.79/mes (CPX11)
- **DigitalOcean:** $4/mes (Basic Droplet)
- **Linode:** $5/mes (Nanode)
- **Vultr:** $2.50/mes (Regular Performance)

#### Configuración:

##### En el VPS:

```bash
# Instalar Nginx
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

# Configurar Nginx
sudo nano /etc/nginx/sites-available/echo
```

```nginx
server {
    listen 80;
    server_name music.tudominio.com;

    location / {
        # Proxy a tu servidor casero (por tunnel SSH)
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/echo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtener SSL
sudo certbot --nginx -d music.tudominio.com
```

##### En tu servidor casero:

```bash
# Crear tunnel SSH reverso (permanente)
# Esto redirige puerto 8080 del VPS a puerto 4567 local
ssh -N -R 8080:localhost:4567 user@IP_VPS

# Para que sea permanente, usar autossh
sudo apt install autossh

# Crear servicio systemd
sudo nano /etc/systemd/system/echo-tunnel.service
```

```ini
[Unit]
Description=Echo Music Server Reverse Tunnel
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

### 🥉 **Opción 5: Pedir IP Pública al ISP**

**Ventajas:**
- ✅ Solución "oficial"
- ✅ Control total

**Desventajas:**
- ❌ Puede costar dinero ($5-15/mes extra)
- ❌ No todos los ISP lo ofrecen
- ❌ Puede tomar días/semanas

#### Cómo solicitar:

1. Llamar a soporte de tu ISP
2. Pedir "IP pública" o "salir de CGNAT"
3. Algunos ISP lo llaman "IP fija" o "IP dedicada"
4. En algunos países es un derecho (pedir "IPv4 pública")

**ISPs que suelen ofrecer IP pública:**
- Movistar España: A veces gratis con fibra
- Orange: Suele incluirla
- Vodafone: A veces cuesta extra

---

## 🎯 **¿Cuál elegir?**

| Caso de uso | Solución recomendada |
|-------------|---------------------|
| **Acceso personal** (solo tú y familia) | Tailscale 🥇 |
| **Acceso público** (compartir con amigos) | Cloudflare Tunnel 🥇 |
| **Testing rápido** | Ngrok |
| **Producción seria** | VPS + Tunnel |
| **Presupuesto = 0** | Cloudflare Tunnel o Tailscale |
| **Presupuesto > 0** | VPS ($3-5/mes) |

---

## 🔧 **Comparación detallada**

| Solución | Costo | Complejidad | Límites | Público | SSL |
|----------|-------|-------------|---------|---------|-----|
| Cloudflare Tunnel | Gratis | Media | Ninguno | ✅ | ✅ |
| Tailscale | Gratis | Fácil | 100 dispositivos | ❌ | ✅ |
| Ngrok | Gratis | Muy fácil | 40 conn/min | ✅ | ✅ |
| VPS + Tunnel | $3-5/mes | Alta | Ninguno | ✅ | ✅ |
| IP Pública ISP | $0-15/mes | Fácil | Ninguno | ✅ | Manual |

---

## 📋 **Checklist de decisión**

```
¿Tienes CGNAT?
├─ NO → Usa port forwarding normal
│         (Sigue NGINX_SETUP.md)
│
└─ SÍ → ¿Solo acceso personal?
    ├─ SÍ → Tailscale
    │
    └─ NO → ¿Quieres que sea público?
        ├─ SÍ → ¿Tienes dominio?
        │   ├─ SÍ → Cloudflare Tunnel
        │   └─ NO → Ngrok (temporal) o comprar dominio gratis
        │
        └─ ¿Puedes gastar $3-5/mes?
            ├─ SÍ → VPS + Tunnel
            └─ NO → Pedir IP pública al ISP
```

---

## 🐛 **Troubleshooting**

### Error: "Tunnel no conecta"

```bash
# Cloudflare Tunnel
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f

# Verificar que Echo esté corriendo
docker compose ps
curl http://localhost:4567/health
```

### Error: "No puedo acceder desde fuera"

1. Verificar DNS:
   ```bash
   dig music.tudominio.com
   ```

2. Verificar SSL:
   ```bash
   curl -I https://music.tudominio.com
   ```

3. Ver logs:
   ```bash
   # Cloudflare Tunnel
   cloudflared tunnel info echo-music

   # Ngrok
   ngrok http 4567 --log=stdout
   ```

### Error: "WebSocket no funciona"

Asegúrate de que tu solución soporte WebSocket:
- ✅ Cloudflare Tunnel: Requiere configuración especial (ver arriba)
- ✅ Tailscale: Funciona automáticamente
- ✅ Ngrok: Funciona automáticamente
- ✅ VPS Tunnel: Requiere configuración Nginx (ver arriba)

---

## 📞 **Ayuda adicional**

- **Cloudflare Tunnel:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Tailscale:** https://tailscale.com/kb/
- **Ngrok:** https://ngrok.com/docs
- **Echo Issues:** https://github.com/Alexzafra13/echo/issues

---

**💡 Recomendación personal:**

Para la mayoría de usuarios con CGNAT → **Cloudflare Tunnel**

- Gratis
- Fácil de configurar
- SSL incluido
- Sin límites
- Funciona siempre
