# 📸 Guía para Agregar Imágenes al Frontend

Esta guía te explica cómo y dónde subir las imágenes para el proyecto Echo.

## 📁 Estructura de Carpetas

```
frontend/
└── public/
    └── images/
        ├── backgrounds/
        │   └── login-bg.jpg       ← Imagen de fondo del login
        ├── logos/
        │   ├── echo-logo.png      ← Logo completo (icono + texto)
        │   └── echo-icon.png      ← Solo el icono (para el círculo)
        └── icons/
            └── favicon.ico         ← Icono del navegador
```

## 🎨 Imágenes Necesarias para Login

### 1. Background del Login
**Archivo:** `public/images/backgrounds/login-bg.jpg`

**Especificaciones:**
- Formato: JPG o WebP
- Tamaño recomendado: 1920x1080px (Full HD)
- Peso: < 500KB (optimizada)
- Contenido: Imagen relacionada con música (vinilo, concierto, instrumentos)

**Nota:** La imagen se verá oscurecida (brightness 30%) para que el contenido sea legible encima.

### 2. Logo Icono (para el círculo naranja)
**Archivo:** `public/images/logos/echo-icon.png`

**Especificaciones:**
- Formato: PNG con transparencia
- Tamaño: 512x512px (se redimensionará a 60x60px)
- Contenido: Solo el símbolo/icono de Echo
- Fondo: Transparente
- Se mostrará dentro del círculo naranja de 80x80px

### 3. Logo Completo (opcional, para otras páginas)
**Archivo:** `public/images/logos/echo-logo.png`

**Especificaciones:**
- Formato: PNG con transparencia
- Tamaño: Ancho flexible x 200px alto
- Contenido: Icono + texto "Echo"
- Uso: Para navbar, footer, otras páginas

## 🚀 Cómo Subir las Imágenes

### Método 1: Copiar Directamente (Recomendado)

1. **Navega a la carpeta del proyecto:**
   ```bash
   cd echo/frontend/public/images
   ```

2. **Copia tus imágenes:**
   ```bash
   # Windows
   copy "C:\ruta\a\tu\imagen.jpg" backgrounds\login-bg.jpg
   copy "C:\ruta\a\tu\logo.png" logos\echo-icon.png

   # Mac/Linux
   cp ~/Downloads/mi-imagen.jpg backgrounds/login-bg.jpg
   cp ~/Downloads/mi-logo.png logos/echo-icon.png
   ```

3. **Verifica que estén en el lugar correcto:**
   ```bash
   ls backgrounds/
   ls logos/
   ```

### Método 2: Arrastrar y Soltar

1. Abre el explorador de archivos
2. Navega a `echo/frontend/public/images/`
3. Arrastra tus imágenes a las carpetas correspondientes
4. Renombra los archivos según la convención:
   - `login-bg.jpg`
   - `echo-icon.png`

### Método 3: Desde Git

```bash
# Agregar las imágenes
git add frontend/public/images/

# Ver qué se agregará
git status

# Commit (opcional, o espera a tener todas)
git commit -m "feat: add login images"
```

## ✅ Verificar que Funciona

### 1. Inicia el frontend:
```bash
cd frontend
pnpm install  # Solo primera vez
pnpm dev
```

### 2. Abre el navegador en:
```
http://localhost:5173/login
```

### 3. Deberías ver:
- ✅ La imagen de fondo detrás de todo (oscurecida)
- ✅ El logo en el círculo naranja
- ✅ Badge "V1" en la esquina del logo

### 4. Si no ves las imágenes:
- Abre la consola del navegador (F12)
- Ve a la pestaña "Network"
- Busca errores 404
- Verifica que los nombres de archivo coincidan exactamente

## 🎨 Optimizar Imágenes (Opcional pero Recomendado)

### Para JPG (Background):
```bash
# Con ImageMagick
convert original.jpg -quality 85 -resize 1920x1080 login-bg.jpg

# O usa herramientas online:
# - https://tinyjpg.com/
# - https://squoosh.app/
```

### Para PNG (Logo):
```bash
# Con ImageMagick
convert original.png -resize 512x512 echo-icon.png

# O usa herramientas online:
# - https://tinypng.com/
# - https://squoosh.app/
```

## 📝 Nombres de Archivo - Convención

**Usa kebab-case (minúsculas con guiones):**
- ✅ `login-bg.jpg`
- ✅ `echo-icon.png`
- ✅ `home-banner.jpg`
- ❌ `LoginBG.jpg`
- ❌ `Echo_Icon.png`
- ❌ `home banner.jpg`

## 🔄 Cambiar Imágenes Después

Si quieres cambiar una imagen:

1. Reemplaza el archivo en la misma ubicación
2. **Importante:** Refresca el navegador con Ctrl+Shift+R (hard refresh)
3. Si no se actualiza, limpia la caché del navegador

## 📦 Imágenes en Git

**Las imágenes NO están ignoradas** (a propósito), así que:
- ✅ Se subirán a Git
- ✅ Otros desarrolladores las tendrán
- ⚠️ No subas imágenes muy pesadas (> 1MB)

Si quieres ignorar las imágenes:
```bash
# Agrega a frontend/.gitignore
public/images/**/*.jpg
public/images/**/*.png
!public/images/.gitkeep
```

## 🎯 Checklist

Antes de continuar, asegúrate de tener:

- [ ] `public/images/backgrounds/login-bg.jpg` - Background del login
- [ ] `public/images/logos/echo-icon.png` - Icono para el círculo
- [ ] Imágenes optimizadas (< 500KB)
- [ ] Frontend corriendo (`pnpm dev`)
- [ ] Login visible en `http://localhost:5173/login`

## 💡 Tips

1. **Usa imágenes relacionadas con música**: vinilos, instrumentos, conciertos, ondas de sonido
2. **El background debe tener buen contraste**: colores no muy brillantes para que el texto se lea bien
3. **El logo debe ser simple**: se verá pequeño en el círculo de 60x60px
4. **Guarda varias versiones**: por si quieres cambiar después

## 🆘 Problemas Comunes

### "No veo la imagen de background"
- Verifica que el archivo se llame exactamente `login-bg.jpg`
- Revisa que esté en `public/images/backgrounds/`
- Haz hard refresh (Ctrl+Shift+R)

### "El logo no aparece"
- Verifica que el archivo se llame exactamente `echo-icon.png`
- Revisa que esté en `public/images/logos/`
- Abre la consola (F12) y busca errores 404

### "Las imágenes son muy grandes"
- Usa herramientas de optimización (TinyPNG, Squoosh)
- Redimensiona a los tamaños recomendados
- Convierte a WebP si es posible (mejor compresión)

---

**¿Listo para continuar?** Una vez que tengas las imágenes, podemos:
- Ajustar el diseño del login
- Crear más páginas (Home, Player, etc.)
- Implementar el servicio de autenticación
