# Echo - Sistema de Diseño Completo

> Sistema de diseño para aplicación de streaming musical self-hosted

## 📋 Tabla de Contenidos

- [Tipografía](#tipografía)
- [Paleta de Colores](#paleta-de-colores)
- [Componentes](#componentes)
- [Variables CSS](#variables-css)

---

## 🔤 Tipografía

### Fuentes Principales

**Outfit** - Display (Logo, Títulos, Headers)

```css
@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&display=swap");
```

**Inter** - UI (Texto de interfaz, Body, Botones)

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap");
```

### Escala Tipográfica

| Nombre         | Tamaño          | Peso         | Uso                   |
| -------------- | --------------- | ------------ | --------------------- |
| **Display XL** | 3rem (48px)     | 700 Bold     | Hero, Logo grande     |
| **Display LG** | 2.5rem (40px)   | 700 Bold     | Títulos principales   |
| **Display MD** | 2rem (32px)     | 600 Semibold | Subtítulos grandes    |
| **H1**         | 1.875rem (30px) | 700 Bold     | Títulos de sección    |
| **H2**         | 1.5rem (24px)   | 600 Semibold | Títulos de card/modal |
| **H3**         | 1.25rem (20px)  | 600 Semibold | Subtítulos            |
| **H4**         | 1.125rem (18px) | 500 Medium   | Texto destacado       |
| **Base**       | 1rem (16px)     | 400 Normal   | Texto principal       |
| **Small**      | 0.875rem (14px) | 400 Normal   | Texto secundario      |
| **XSmall**     | 0.75rem (12px)  | 400 Normal   | Labels, metadatos     |
| **2XSmall**    | 0.625rem (10px) | 600 Semibold | Badges (uppercase)    |

### Variables Tipográficas

```css
:root {
  /* Familias */
  --font-display: "Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-ui: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "SF Mono", "Monaco", "Cascadia Code", "Consolas", monospace;

  /* Pesos */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;

  /* Tamaños */
  --font-size-display-xl: 3rem;
  --font-size-display-lg: 2.5rem;
  --font-size-display-md: 2rem;
  --font-size-h1: 1.875rem;
  --font-size-h2: 1.5rem;
  --font-size-h3: 1.25rem;
  --font-size-h4: 1.125rem;
  --font-size-base: 1rem;
  --font-size-sm: 0.875rem;
  --font-size-xs: 0.75rem;
  --font-size-2xs: 0.625rem;

  /* Line Heights */
  --line-height-tight: 1.1;
  --line-height-snug: 1.3;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;

  /* Letter Spacing */
  --letter-spacing-tighter: -0.02em;
  --letter-spacing-tight: -0.01em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.025em;
  --letter-spacing-wider: 0.05em;
}
```

---

## 🎨 Paleta de Colores

### Colores Primarios (Coral Sunset)

Coral - Color de identidad de marca

```css
--color-primary-50: #fff5f0;
--color-primary-100: #ffe8dc;
--color-primary-200: #ffd0ba;
--color-primary-300: #ffb088;
--color-primary-400: #ff9066; /* Coral principal - Botones, highlights */
--color-primary-500: #ff7f50; /* Coral base - Logo, elementos activos */
--color-primary-600: #f56038;
--color-primary-700: #e04420;
--color-primary-800: #b83317;
--color-primary-900: #8a2511;
```

### Colores Secundarios (Teal/Cyan)

Acentos complementarios

```css
--color-secondary-50: #ecfeff;
--color-secondary-100: #cffafe;
--color-secondary-200: #a5f3fc;
--color-secondary-300: #67e8f9;
--color-secondary-400: #22d3ee; /* Teal/Cian - Links, iconos info */
--color-secondary-500: #06b6d4;
--color-secondary-600: #0891b2;
--color-secondary-700: #0e7490;
--color-secondary-800: #155e75;
--color-secondary-900: #164e63;
```

### Backgrounds (Fondos Oscuros)

```css
--color-bg-primary: #0f172a; /* Slate 900 - Background principal */
--color-bg-secondary: #1e293b; /* Slate 800 - Cards, modales */
--color-bg-tertiary: #334155; /* Slate 700 - Elementos elevados */
--color-bg-sidebar: #020617; /* Slate 950 - Sidebar */
--color-bg-hover: rgba(51, 65, 85, 0.5);
--color-bg-overlay: rgba(15, 23, 42, 0.95);
```

### Textos (Jerarquía de Lectura)

```css
--color-text-primary: #f8fafc; /* Slate 50 - Texto principal */
--color-text-secondary: #cbd5e1; /* Slate 300 - Texto secundario */
--color-text-tertiary: #94a3b8; /* Slate 400 - Texto terciario */
--color-text-disabled: #64748b; /* Slate 500 - Texto deshabilitado */
--color-text-muted: #475569; /* Slate 600 - Texto muy tenue */
```

### Borders & Dividers

```css
--color-border-light: #334155; /* Slate 700 - Borders normales */
--color-border-dark: #1e293b; /* Slate 800 - Borders sutiles */
--color-border-focus: #ff9066; /* Primary 400 - Focus states */
```

### Estados Semánticos

#### Success (Verde)

```css
--color-success-400: #4ade80;
--color-success-500: #22c55e; /* Verde principal */
--color-success-600: #16a34a;
```

#### Warning (Amarillo/Ámbar)

```css
--color-warning-400: #fbbf24;
--color-warning-500: #f59e0b; /* Amarillo principal */
--color-warning-600: #d97706;
```

#### Error (Rojo)

```css
--color-error-400: #f87171;
--color-error-500: #ef4444; /* Rojo principal */
--color-error-600: #dc2626;
```

#### Info (Azul)

```css
--color-info-400: #60a5fa;
--color-info-500: #3b82f6; /* Azul principal */
--color-info-600: #2563eb;
```

### Estados Especiales

```css
/* Like/Favorite */
--color-like: var(--color-primary-500);
--color-like-hover: var(--color-primary-400);

/* Playing Now */
--color-playing: var(--color-primary-400);
--color-playing-glow: rgba(255, 144, 102, 0.2);

/* Premium/Pro */
--color-premium-gradient-start: #fbbf24;
--color-premium-gradient-end: #f59e0b;
```

---

## 🎭 Gradientes

```css
/* Primario */
--gradient-primary: linear-gradient(
  135deg,
  var(--color-primary-400) 0%,
  var(--color-primary-500) 100%
);

--gradient-primary-hover: linear-gradient(
  135deg,
  var(--color-primary-500) 0%,
  var(--color-primary-600) 100%
);

/* Hero */
--gradient-hero: linear-gradient(
  180deg,
  rgba(255, 127, 80, 0.15) 0%,
  var(--color-bg-primary) 100%
);

/* Overlay */
--gradient-overlay: linear-gradient(
  90deg,
  var(--color-bg-primary) 0%,
  rgba(15, 23, 42, 0.8) 50%,
  transparent 100%
);

/* Premium */
--gradient-premium: linear-gradient(
  135deg,
  var(--color-premium-gradient-start) 0%,
  var(--color-premium-gradient-end) 100%
);
```

---

## 🌗 Sombras

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

/* Sombras con color primario */
--shadow-primary: 0 10px 20px rgba(255, 127, 80, 0.2);
--shadow-primary-lg: 0 20px 30px rgba(255, 127, 80, 0.3);
```

---

## ⚙️ Sistema de Valores

### Opacidades

```css
--opacity-hover: 0.8;
--opacity-disabled: 0.5;
--opacity-overlay: 0.95;
--opacity-subtle: 0.1;
```

### Transiciones

```css
--transition-fast: 150ms ease-in-out;
--transition-base: 200ms ease-in-out;
--transition-slow: 300ms ease-in-out;
```

### Border Radius

```css
--radius-sm: 0.375rem; /* 6px */
--radius-md: 0.5rem; /* 8px */
--radius-lg: 0.75rem; /* 12px */
--radius-xl: 1rem; /* 16px */
--radius-2xl: 1.5rem; /* 24px */
--radius-full: 9999px; /* Circular */
```

### Z-Index (Capas)

```css
--z-base: 0;
--z-dropdown: 1000;
--z-sticky: 1020;
--z-fixed: 1030;
--z-modal-backdrop: 1040;
--z-modal: 1050;
--z-popover: 1060;
--z-tooltip: 1070;
--z-notification: 1080;
```

---

## 🎯 Componentes Principales

### Logo

```css
.logo {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-tighter);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Botón Primario

```css
.btn-primary {
  font-family: var(--font-ui);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  padding: 14px 24px;
  background: var(--gradient-primary);
  border: none;
  border-radius: var(--radius-lg);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: var(--transition-base);
  box-shadow: var(--shadow-primary);
}

.btn-primary:hover {
  background: var(--gradient-primary-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-primary-lg);
}
```

### Input/Form

```css
.form-input {
  font-family: var(--font-ui);
  font-size: var(--font-size-base);
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  color: var(--color-text-primary);
  transition: var(--transition-base);
}

.form-input:focus {
  border-color: var(--color-border-focus);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 4px rgba(255, 144, 102, 0.1);
}
```

### Card

```css
.card {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-xl);
  padding: 16px;
  border: 1px solid var(--color-border-dark);
  transition: var(--transition-base);
}

.card:hover {
  background: var(--color-bg-tertiary);
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
```

### Badge

```css
.badge {
  font-family: var(--font-ui);
  font-size: var(--font-size-2xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wider);
  text-transform: uppercase;
  color: var(--color-text-tertiary);
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}
```

### Song Title (Playing State)

```css
.song-title {
  font-family: var(--font-display);
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-snug);
  color: var(--color-text-primary);
  transition: var(--transition-base);
}

.song-title.playing {
  color: var(--color-playing);
}
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile First */
@media (min-width: 640px) {
  /* sm */
}
@media (min-width: 768px) {
  /* md */
}
@media (min-width: 1024px) {
  /* lg */
}
@media (min-width: 1280px) {
  /* xl */
}
@media (min-width: 1536px) {
  /* 2xl */
}
```

---

## 🌙 Modo Claro (Opcional)

```css
[data-theme="light"] {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-tertiary: #f1f5f9;

  --color-text-primary: #0f172a;
  --color-text-secondary: #334155;
  --color-text-tertiary: #64748b;

  --color-border-light: #e2e8f0;
  --color-border-dark: #cbd5e1;

  --color-primary-500: #f56038;
  --shadow-primary: 0 10px 20px rgba(255, 127, 80, 0.15);
}
```

---

## 📝 Ejemplo de Uso

```css
/* Clase personalizada usando el sistema */
.player-control {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 12px 20px;
  font-family: var(--font-ui);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: var(--transition-base);
  cursor: pointer;
}

.player-control:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-primary-400);
  transform: scale(1.05);
}

.player-control.active {
  background: var(--gradient-primary);
  color: white;
  box-shadow: var(--shadow-primary);
}
```

---

## 🎨 Arquitectura de Estilos Recomendada

```
src/
├── styles/
│   ├── base/
│   │   ├── _reset.css          # Reset/normalize
│   │   ├── _typography.css     # Sistema tipográfico
│   │   └── _colors.css         # Paleta de colores
│   ├── components/
│   │   ├── _buttons.css
│   │   ├── _cards.css
│   │   ├── _forms.css
│   │   ├── _player.css
│   │   └── _navigation.css
│   ├── layout/
│   │   ├── _grid.css
│   │   ├── _sidebar.css
│   │   └── _header.css
│   └── main.css                # Importa todo
```

---

## 🚀 Mejores Prácticas

1. **Consistencia**: Siempre usa variables CSS del sistema
2. **Jerarquía**: Respeta la escala tipográfica definida
3. **Accesibilidad**: Mantén contraste mínimo 4.5:1 para texto
4. **Performance**: Usa `font-display: swap` para web fonts
5. **Responsive**: Mobile-first approach
6. **Semántica**: Usa colores semánticos para estados (success, error, etc.)
7. **Transiciones**: Aplica transiciones suaves a estados interactivos
8. **Espaciado**: Mantén múltiplos de 4px (sistema de 8-point grid)

---

**Versión**: 1.0  
**Última actualización**: 2025  
**Proyecto**: Echo Music Streaming App
