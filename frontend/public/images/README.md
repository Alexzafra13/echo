# Public Images

Imágenes estáticas que se sirven directamente sin procesamiento de Vite.

## Estructura

```
images/
├── backgrounds/     # Imágenes de fondo (login, home, etc.)
├── logos/          # Logos principales de Echo
└── icons/          # Iconos estáticos (favicon, etc.)
```

## Uso

Las imágenes en `/public` se referencian con rutas absolutas desde la raíz:

```tsx
// En cualquier componente
<img src="/images/logos/echo-logo.png" alt="Echo Logo" />
<div style={{ backgroundImage: "url('/images/backgrounds/login-bg.jpg')" }} />
```

## Recomendaciones

- **Backgrounds**: JPG/WebP optimizados (< 500KB)
- **Logos**: PNG con transparencia
- **Nombres**: kebab-case (login-bg.jpg, echo-logo.png)

## Imágenes Necesarias

### Para Login Page:
- `/images/backgrounds/login-bg.jpg` - Imagen de fondo del login
- `/images/logos/echo-logo.png` - Logo principal con texto
- `/images/logos/echo-icon.png` - Solo el icono/símbolo (círculo naranja)

### Opcional:
- `/images/logos/echo-logo-white.png` - Logo en blanco para fondos oscuros
- `/images/backgrounds/home-bg.jpg` - Background del home
