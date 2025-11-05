# Echo - Music Streaming Platform

Full-stack music streaming application with hexagonal architecture backend (NestJS) and modern React frontend.

## 📁 Project Structure

```
echo/
├── server/          # Backend - NestJS with Hexagonal Architecture
└── frontend/        # Frontend - React + TypeScript + Vite
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 22
- pnpm >= 10
- Docker & Docker Compose (Docker Desktop para Windows)

### Automated Setup (Recommended)

El proyecto incluye un script de setup que instala todo automáticamente:

```bash
# Clone repository
git clone https://github.com/Alexzafra13/echo.git
cd echo

# Setup automático (Linux/macOS/Git Bash)
pnpm install:first

# Windows (PowerShell nativo)
pnpm install:first:windows
```

El script automáticamente:
- ✅ Verifica requisitos (Node.js, pnpm, Docker)
- ✅ Instala dependencias del backend y frontend
- ✅ Configura variables de entorno (.env)
- ✅ Levanta Docker (PostgreSQL + Redis)
- ✅ Genera cliente Prisma
- ✅ Ejecuta migraciones de Prisma
- ✅ Deja todo listo para trabajar

**Opciones disponibles:**
```bash
pnpm install:first -- --skip-frontend    # Solo backend
pnpm install:first -- --skip-docker      # Sin Docker
pnpm install:first -- --skip-backend     # Solo frontend
```

### Manual Setup

Si prefieres instalarlo manualmente:

```bash
# Backend
cd server
pnpm install
cp .env.development.example .env
docker-compose up -d
pnpm db:migrate
pnpm start:dev

# Frontend (en otra terminal)
cd frontend
pnpm install
pnpm dev
```

### Iniciar Desarrollo

Después del setup, puedes usar estos comandos desde el **ROOT**:

```bash
pnpm dev              # Inicia solo backend
pnpm dev:all          # Inicia backend + frontend en paralelo
pnpm dev:server       # Solo backend
pnpm dev:frontend     # Solo frontend
pnpm docker:dev       # Levantar PostgreSQL + Redis (desarrollo)
pnpm docker:dev:down  # Detener servicios de desarrollo
```

### Access

- **Backend API**: http://localhost:4567/api (Swagger docs at /api/docs)
- **Frontend**: http://localhost:5173

### Development Notes

**⚠️ "Frontend not found" warning in backend console:**
This is **normal and expected** in development mode. The backend looks for `frontend/dist` to serve the built frontend in production (Jellyfin-style single container). In development:
- Frontend is served by Vite at `localhost:5173`
- Backend API runs at `localhost:4567`
- Vite proxies `/api` requests to the backend
- The warning is harmless and can be ignored

The login is **fully functional** in development mode with proper integration between frontend and backend.

## 🐳 Docker Deployment (Production)

Echo follows the **Jellyfin/Navidrome architecture**: a single container serves both API and frontend, perfect for self-hosting.

### Quick Deploy

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your settings (JWT secrets, music path, etc.)

# 2. Build and run
pnpm docker:build
pnpm docker:up

# 3. Access at http://localhost:4567
```

### Architecture

```
Single Container (echo-app)
├── Frontend (React) - served as static files
├── Backend (NestJS) - API + streaming
├── PostgreSQL - database
└── Redis - cache
```

**Benefits:**
- ✅ Simple deployment - one command
- ✅ Self-contained - everything in one image
- ✅ Automatic migrations on startup
- ✅ Production-ready with health checks
- ✅ Minimal resource usage

**Docker Commands:**
```bash
pnpm docker:build      # Build full-stack image
pnpm docker:up         # Start all services
pnpm docker:down       # Stop all services
pnpm docker:logs       # View application logs
pnpm docker:restart    # Restart the app
```

See [DOCKER.md](./DOCKER.md) for full documentation including:
- Production deployment guide
- Reverse proxy setup (Nginx/Caddy)
- Volume management
- Backup strategies
- Troubleshooting

## 📚 Documentation

### Main
- [DOCKER.md](./DOCKER.md) - **Full-stack Docker deployment** (Jellyfin-style)

### Backend (server/)
- [DEPLOYMENT.md](./server/DEPLOYMENT.md) - Production deployment guide
- [DOCKER.md](./server/DOCKER.md) - Backend-only Docker usage
- [DOCKER_COMPOSE_INFO.md](./server/DOCKER_COMPOSE_INFO.md) - Docker Compose guide
- [ENVIRONMENTS.md](./server/ENVIRONMENTS.md) - Environment configuration

### Frontend (frontend/)
- [README.md](./frontend/README.md) - Frontend documentation

## 🛠️ Tech Stack

### Backend
- **NestJS** - Framework with Hexagonal Architecture
- **Fastify** - High-performance HTTP server
- **Prisma** - ORM with PostgreSQL
- **Redis** - Cache & Queue (BullMQ)
- **JWT** - Authentication
- **Docker** - Containerization

### Frontend
- **React 18** - UI Library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Wouter** - Lightweight routing
- **Zustand** - State management
- **Tanstack Query** - Data fetching & caching
- **React Hook Form + Zod** - Form handling & validation
- **CSS Modules** - Styling with design system
- **Axios** - HTTP client with interceptors

## 🎯 Features

### Backend
- ✅ **Authentication** - JWT with roles (user/admin)
- ✅ **Music Library** - Albums, Artists, Tracks
- ✅ **Playlists** - Create, edit, manage playlists
- ✅ **Scanner** - Automatic music file scanning with metadata
- ✅ **External Metadata** - Enrich library from Last.fm, Fanart.tv, Cover Art Archive
- ✅ **Streaming** - Audio streaming
- ✅ **Admin Panel** - User management
- ✅ **Cache** - Redis caching layer
- ✅ **Tests** - Unit & E2E tests

### Frontend
- ✅ **Login Page** - Minimalist design with logo and form validation (fully functional with backend integration)
- 🚧 **HomePage** - Modern music streaming interface (in progress)
  - Hero section with featured album
  - Recently added albums grid
  - Daily mix recommendations
  - Sidebar navigation
  - Search functionality
- 🔜 **Music Player** - Audio playback controls
- 🔜 **Library Views** - Albums, Artists, Tracks browsing
- 🔜 **Playlist Management** - Create, edit, and organize playlists

## 🌐 External Metadata Enrichment

Echo can automatically enrich your music library with high-quality metadata from external services.

### 📋 Supported Services

| Service | Purpose | API Key | Rate Limit |
|---------|---------|---------|------------|
| **Cover Art Archive** | Album covers (250px, 500px, 1200px) | ❌ Not required | 1 req/sec |
| **Last.fm** | Artist biographies & profile images | ✅ Required (free) | 5 req/sec |
| **Fanart.tv** | HD backgrounds, banners, logos | ✅ Required (free) | 2-10 req/sec |

### 🔑 Quick Setup (5 minutes)

**1. Copy the example environment file:**
```bash
cd server
cp .env.example .env
```

**2. Get Last.fm API key (2 min, free):**
- Visit: https://www.last.fm/api/account/create
- Fill in: Application name: "Echo" or "Echo Development"
- Copy your API key
- Add to `.env`: `LASTFM_API_KEY=your_key_here`

**3. Get Fanart.tv API key (2 min, free):**
- Register at: https://fanart.tv
- Request key at: https://fanart.tv/get-an-api-key/
- Check your email for the key
- Add to `.env`: `FANART_API_KEY=your_key_here`

**4. Your `.env` should look like:**
```bash
LASTFM_API_KEY=abc123your_actual_key_here
LASTFM_ENABLED=true

FANART_API_KEY=xyz789your_actual_key_here
FANART_ENABLED=true

COVERART_ENABLED=true
```

### ✨ What Gets Enriched

- **Artist Biographies**: Detailed artist information from Last.fm
- **Profile Images**: Artist photos in multiple sizes
- **HD Backgrounds**: 1920x1080 backgrounds for Hero sections (Fanart.tv)
- **Banners**: Artist page banners (Fanart.tv)
- **Logos**: Transparent logos for overlays (Fanart.tv)
- **Album Covers**: Official releases in 3 sizes from Cover Art Archive

### 🚀 Usage

**Manual enrichment via API:**
```bash
# Enrich a single artist
POST /api/metadata/artists/:id/enrich?forceRefresh=false

# Enrich a single album
POST /api/metadata/albums/:id/enrich?forceRefresh=false
```

**Real-time progress via WebSocket:**
```javascript
const socket = io('http://localhost:4567/metadata');
socket.on('enrichment:progress', (data) => {
  console.log(`${data.percentage}% - ${data.step}`);
});
```

### 💾 Caching & Rate Limiting

- **Smart caching**: All metadata cached for 30 days (configurable)
- **Non-overwrite**: Only enriches missing data (use `?forceRefresh=true` to override)
- **Rate limiting**: Automatically respects each API's limits
- **Fallback chain**: Tries multiple sources in priority order

### 🔒 Security Note

**⚠️ NEVER commit your API keys to the repository!**

- ✅ Use `.env` for your keys (already in `.gitignore`)
- ✅ Share `.env.example` with placeholders only
- ❌ Don't put real keys in `.env.example`
- ❌ Don't share your keys publicly

**Why each user needs their own keys:**
- **Rate limits**: Shared keys = shared quotas (too slow)
- **Security**: Public keys can be abused and get blocked
- **Free**: All APIs offer free tiers with no credit card
- **Fast**: Takes ~5 minutes total to get all keys

### 📚 More Info

See full documentation: [External Metadata README](./server/src/features/external-metadata/README.md)

## 📦 Scripts

### Root (Monorepo)
```bash
# Setup
pnpm install:first         # Instalación inicial automatizada (Linux/macOS/Git Bash)
pnpm install:first:windows # Setup para Windows PowerShell

# Development
pnpm dev                # Solo backend
pnpm dev:all            # Backend + Frontend en paralelo
pnpm dev:server         # Solo backend
pnpm dev:frontend       # Solo frontend

# Build
pnpm build              # Build frontend + backend (en orden)
pnpm build:server       # Build del backend
pnpm build:frontend     # Build del frontend

# Testing
pnpm test               # Tests del backend
pnpm test:server        # Tests del backend
pnpm test:frontend      # Tests del frontend

# Docker Development (solo DB + Redis)
pnpm docker:dev         # Levantar PostgreSQL + Redis
pnpm docker:dev:down    # Detener servicios

# Docker Production (full-stack)
pnpm docker:build       # Build imagen full-stack
pnpm docker:up          # Levantar todo (app + DB + Redis)
pnpm docker:down        # Detener todo
pnpm docker:logs        # Ver logs de la app
pnpm docker:restart     # Reiniciar la app

# Utilities
pnpm install:all        # Instalar todas las dependencias
pnpm clean              # Limpiar node_modules y builds
pnpm lint:server        # Lint del backend
pnpm lint:frontend      # Lint del frontend
pnpm format:server      # Format del backend
pnpm format:frontend    # Format del frontend
```

### Backend (server/)
```bash
pnpm start:dev          # Development mode
pnpm build              # Build for production
pnpm test               # Run tests
pnpm db:migrate         # Run database migrations
pnpm db:studio          # Open Prisma Studio
```

### Frontend (frontend/)
```bash
pnpm dev                # Development mode
pnpm build              # Build for production
pnpm preview            # Preview production build
```

## 🎨 Frontend - HomePage Integration Guide

### Overview

Echo's HomePage es la página principal después del login, diseñada con un estilo moderno inspirado en Spotify/Apple Music. Presenta una interfaz limpia con:
- **Hero Section**: Álbum destacado con imagen de fondo y controles de reproducción
- **Sidebar Navigation**: Navegación fija con el logo de Echo y enlaces principales
- **Album Grid**: Grid responsivo con álbumes recientes y daily mixes
- **Search Bar**: Búsqueda global en el header

### Design Philosophy

El diseño sigue estos principios:
- **Código limpio y modular**: Componentes pequeños con responsabilidades únicas
- **Separación de concerns**: Lógica de negocio separada de presentación
- **Reutilización**: Componentes compartidos en `@shared/components`
- **Type-safety**: TypeScript en todos los componentes
- **Responsive**: Mobile-first con breakpoints para tablet y desktop

### Project Structure

```
frontend/src/
├── features/
│   ├── home/                          # HomePage feature
│   │   ├── components/
│   │   │   ├── HeroSection/          # Hero con álbum destacado
│   │   │   │   ├── HeroSection.tsx
│   │   │   │   └── HeroSection.module.css
│   │   │   ├── AlbumCard/            # Card individual de álbum
│   │   │   │   ├── AlbumCard.tsx
│   │   │   │   └── AlbumCard.module.css
│   │   │   ├── AlbumGrid/            # Grid de álbumes
│   │   │   │   ├── AlbumGrid.tsx
│   │   │   │   └── AlbumGrid.module.css
│   │   │   └── Sidebar/              # Navegación lateral
│   │   │       ├── Sidebar.tsx
│   │   │       └── Sidebar.module.css
│   │   ├── pages/
│   │   │   └── HomePage/
│   │   │       ├── HomePage.tsx       # Página principal
│   │   │       └── HomePage.module.css
│   │   ├── hooks/
│   │   │   ├── useAlbums.ts          # Hook para obtener álbumes
│   │   │   └── useFeaturedAlbum.ts   # Hook para álbum destacado
│   │   ├── services/
│   │   │   └── albums.service.ts     # API calls para álbumes
│   │   └── types/
│   │       └── album.types.ts        # TypeScript types
│   │
│   └── auth/                          # Existing auth feature
│       └── pages/
│           └── LoginPage/             # ✅ Solo con logo (implementado)
│
├── shared/
│   ├── components/
│   │   ├── ui/                        # Base UI components
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   └── Card/
│   │   └── layout/                    # Layout components
│   │       ├── Header/                # Header con search y navegación
│   │       └── MainLayout/            # Layout principal con sidebar
│   └── styles/
│       └── variables.css              # Design tokens
│
public/
└── images/
    ├── logos/
    │   └── echo-icon.png              # Logo de Echo (100x100px)
    ├── backgrounds/
    │   └── login-bg.jpg               # Fondo de concierto
    ├── albums/                        # Portadas de álbumes
    │   ├── featured-album-cover.jpg   # 200x200px - Portada
    │   ├── featured-album-bg.jpg      # 1920x1080px - Background hero
    │   ├── featured-album-art.png     # 400xAuto - Arte lateral (opcional)
    │   └── [album-id].jpg             # Portadas de otros álbumes
    └── user-avatar.jpg                # Avatar del usuario (40x40px)
```

### Component Architecture

#### 1. HomePage (Container)
**Responsabilidad**: Orquestar componentes y manejar estado de la página

```typescript
// features/home/pages/HomePage/HomePage.tsx
import { HeroSection, AlbumGrid, Sidebar } from '../../components';
import { Header } from '@shared/components/layout';
import { useFeaturedAlbum, useRecentAlbums } from '../../hooks';

export default function HomePage() {
  const { featuredAlbum, isLoading: loadingFeatured } = useFeaturedAlbum();
  const { recentAlbums, isLoading: loadingRecent } = useRecentAlbums();

  return (
    <div className={styles.container}>
      <Sidebar />
      <main className={styles.main}>
        <Header />
        <div className={styles.content}>
          {!loadingFeatured && featuredAlbum && (
            <HeroSection album={featuredAlbum} />
          )}
          {!loadingRecent && (
            <>
              <AlbumGrid title="Recientemente Añadidos" albums={recentAlbums} />
              <AlbumGrid title="Daily Mix" albums={dailyMix} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
```

#### 2. HeroSection (Presentational)
**Responsabilidad**: Mostrar álbum destacado con controles

```typescript
// features/home/components/HeroSection/HeroSection.tsx
interface HeroSectionProps {
  album: Album;
  onPlay?: () => void;
}

export function HeroSection({ album, onPlay }: HeroSectionProps) {
  return (
    <section className={styles.hero}>
      <div
        className={styles.heroBackground}
        style={{ backgroundImage: `url(${album.backgroundImage})` }}
      />
      <div className={styles.heroContent}>
        <img src={album.coverImage} alt={album.title} className={styles.albumCover} />
        <div className={styles.albumInfo}>
          <h1 className={styles.artistName}>{album.artist}</h1>
          <h2 className={styles.albumTitle}>{album.title}</h2>
          <p className={styles.albumMeta}>
            {album.artist} • {album.title} - {album.year} • {album.totalTracks} Songs
          </p>
          <Button variant="primary" size="lg" onClick={onPlay}>
            <Play size={24} /> Play
          </Button>
        </div>
      </div>
    </section>
  );
}
```

#### 3. AlbumCard (Presentational)
**Responsabilidad**: Mostrar un álbum individual con hover effects

```typescript
// features/home/components/AlbumCard/AlbumCard.tsx
interface AlbumCardProps {
  cover: string;
  title: string;
  artist: string;
  onClick?: () => void;
  onPlayClick?: () => void;
}

export function AlbumCard({ cover, title, artist, onClick, onPlayClick }: AlbumCardProps) {
  return (
    <article className={styles.card} onClick={onClick}>
      <div className={styles.coverContainer}>
        <img src={cover} alt={title} loading="lazy" />
        <div className={styles.overlay}>
          <button className={styles.playButton} onClick={(e) => {
            e.stopPropagation();
            onPlayClick?.();
          }}>
            <Play size={24} />
          </button>
        </div>
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.artist}>{artist}</p>
    </article>
  );
}
```

#### 4. AlbumGrid (Presentational)
**Responsabilidad**: Layout de grid para múltiples álbumes

```typescript
// features/home/components/AlbumGrid/AlbumGrid.tsx
interface AlbumGridProps {
  title: string;
  albums: Album[];
}

export function AlbumGrid({ title, albums }: AlbumGridProps) {
  const navigate = useLocation()[1];

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.grid}>
        {albums.map(album => (
          <AlbumCard
            key={album.id}
            cover={album.coverImage}
            title={album.title}
            artist={album.artist}
            onClick={() => navigate(`/album/${album.id}`)}
          />
        ))}
      </div>
    </section>
  );
}
```

### Data Fetching Strategy

#### Custom Hooks con TanStack Query

```typescript
// features/home/hooks/useAlbums.ts
import { useQuery } from '@tanstack/react-query';
import { albumsService } from '../services/albums.service';

export function useRecentAlbums() {
  return useQuery({
    queryKey: ['albums', 'recent'],
    queryFn: () => albumsService.getRecent(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useFeaturedAlbum() {
  return useQuery({
    queryKey: ['albums', 'featured'],
    queryFn: () => albumsService.getFeatured(),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}
```

#### Service Layer

```typescript
// features/home/services/albums.service.ts
import { api } from '@shared/services/api';
import type { Album } from '../types/album.types';

export const albumsService = {
  getRecent: async (): Promise<Album[]> => {
    const { data } = await api.get('/albums/recent');
    return data;
  },

  getFeatured: async (): Promise<Album> => {
    const { data } = await api.get('/albums/featured');
    return data;
  },

  getById: async (id: string): Promise<Album> => {
    const { data } = await api.get(`/albums/${id}`);
    return data;
  },
};
```

### TypeScript Types

```typescript
// features/home/types/album.types.ts
export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  coverImage: string;           // URL de la portada (200x200)
  backgroundImage?: string;      // URL del background (para hero)
  albumArt?: string;             // URL del arte lateral (opcional)
  year: number;
  totalTracks: number;
  duration?: number;             // Duración total en segundos
  genres?: string[];
  addedAt: Date;
}

export interface AlbumCardProps {
  cover: string;
  title: string;
  artist: string;
  onClick?: () => void;
  onPlayClick?: () => void;
}

export interface HeroAlbumData {
  album: Album;
  isPlaying?: boolean;
}
```

### Image Management

#### Recommended Image Sizes

```
logos/
  └── echo-icon.png              (100x100px, PNG con transparencia)

backgrounds/
  └── login-bg.jpg               (1920x1080px, JPG optimizado)

albums/
  ├── [album-id]-cover.jpg       (200x200px, JPG - Para cards)
  ├── [album-id]-bg.jpg          (1920x1080px, JPG - Para hero background)
  └── [album-id]-art.png         (400xAuto, PNG - Arte opcional)
```

#### Image Loading Strategy

```typescript
// shared/components/ui/LazyImage/LazyImage.tsx
export function LazyImage({ src, alt, fallback }: LazyImageProps) {
  const [imgSrc, setImgSrc] = useState(fallback);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setImgSrc(src);
  }, [src]);

  return <img src={imgSrc} alt={alt} loading="lazy" />;
}
```

### Color System

```css
/* shared/styles/variables.css */
:root {
  /* Background Colors */
  --color-bg-primary: #0a0e27;        /* Main background */
  --color-bg-secondary: #14151f;      /* Sidebar background */
  --color-bg-tertiary: #1e1f2e;       /* Card backgrounds */

  /* Primary Colors */
  --color-primary: #ff6b6b;           /* Coral/Orange - Brand color */
  --color-primary-hover: #ff5252;
  --color-primary-light: rgba(255, 107, 107, 0.15);

  /* Accent Colors */
  --color-accent: #ff3333;            /* Red - Album titles */
  --color-accent-hover: #ff1a1a;

  /* Text Colors */
  --color-text-primary: #ffffff;      /* White - Headings */
  --color-text-secondary: #b8bcc8;    /* Gray - Body text */
  --color-text-tertiary: #6b7280;     /* Darker gray - Metadata */

  /* Interactive */
  --color-overlay: rgba(0, 0, 0, 0.6);
  --color-hover: rgba(255, 255, 255, 0.05);
}
```

### Responsive Design

```css
/* Mobile First */
.container {
  display: flex;
}

.sidebar {
  width: 80px;  /* Icon-only en mobile */
}

.main {
  flex: 1;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
  .sidebar {
    width: 230px;  /* Full sidebar */
  }

  .grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}

/* Desktop (1200px+) */
@media (min-width: 1200px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }

  .hero {
    height: 450px;
  }
}
```

### Integration Checklist

- [ ] Crear estructura de carpetas en `features/home/`
- [ ] Instalar `lucide-react` si no está instalado
- [ ] Crear componentes base (HeroSection, AlbumCard, AlbumGrid, Sidebar)
- [ ] Implementar custom hooks con TanStack Query
- [ ] Crear service layer para API calls
- [ ] Definir TypeScript types
- [ ] Agregar rutas en `App.tsx`
- [ ] Preparar imágenes en `public/images/`
- [ ] Implementar responsive design
- [ ] Agregar tests unitarios

### Best Practices

1. **Componente pequeño, responsabilidad única**: Cada componente hace una cosa bien
2. **Separar lógica de presentación**: Hooks para lógica, componentes para UI
3. **Types everywhere**: No usar `any`, definir interfaces claras
4. **CSS Modules**: Evitar colisiones de estilos
5. **Lazy loading**: Cargar imágenes progresivamente
6. **Error boundaries**: Manejar errores gracefully
7. **Loading states**: Mostrar skeletons mientras carga
8. **Accessibility**: ARIA labels, keyboard navigation

### API Integration Example

```typescript
// Backend debe proveer estos endpoints:

GET /api/albums/recent
Response: Album[]

GET /api/albums/featured
Response: Album

GET /api/albums/:id
Response: Album

// Si las imágenes no están en public/images/,
// el backend puede servir imágenes dinámicamente:

GET /api/albums/:id/cover
Response: Image binary (JPEG/PNG)

GET /api/albums/:id/background
Response: Image binary (JPEG)
```

### External API Integration (Optional)

Si no tienes todas las imágenes, puedes usar APIs externas:

```typescript
// services/imageService.ts
import axios from 'axios';

export const imageService = {
  // LastFM API para obtener imágenes de álbumes
  async getAlbumImage(artist: string, album: string) {
    const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: {
        method: 'album.getinfo',
        artist,
        album,
        api_key: process.env.VITE_LASTFM_API_KEY,
        format: 'json',
      },
    });
    return response.data.album.image[3]['#text']; // Large image
  },

  // Fallback a placeholder
  getPlaceholder(title: string) {
    return `https://via.placeholder.com/200/ff6b6b/ffffff?text=${encodeURIComponent(title)}`;
  },
};
```

### Login Status

✅ **Login está completamente funcional:**
- **Backend Integration**: Conectado a `/api/auth/login` endpoint
- **State Management**: Zustand store para user y tokens (access + refresh)
- **Data Fetching**: TanStack Query para mutations con loading/error states
- **Auto Token Refresh**: Axios interceptors refrescan token automáticamente en 401
- **Validation**: React Hook Form + Zod para validación en tiempo real
- **Error Handling**: Mensajes de error claros del backend
- **Redirection**: Redirige a `/` después del login exitoso
- **Protected Routes**: Guard global en backend para rutas protegidas

### Next Steps

1. ✅ **LoginPage** - Completado (solo con logo, completamente funcional)
2. 🚧 **HomePage** - Implementar estructura y componentes
3. 🔜 **Album Detail Page** - Vista individual de álbum
4. 🔜 **Artist Page** - Vista de artista con discografía
5. 🔜 **Search Results** - Página de resultados de búsqueda
6. 🔜 **Music Player** - Reproductor global
7. 🔜 **Playlists** - CRUD de playlists

---

## 🏗️ Architecture

### Backend (Hexagonal Architecture)
```
server/src/
├── features/              # Feature modules
│   ├── auth/             # Authentication
│   ├── users/            # User management
│   ├── albums/           # Albums
│   ├── artists/          # Artists
│   ├── tracks/           # Tracks
│   ├── playlists/        # Playlists
│   └── scanner/          # Music scanner
├── infrastructure/        # Technical services
└── shared/               # Shared code
```

### Frontend (Feature-based)
```
frontend/src/
├── app/                  # App initialization
├── features/             # Feature modules
│   └── auth/            # Authentication feature
├── shared/              # Shared components
│   ├── components/ui/   # Base UI components
│   └── styles/          # Design system
└── assets/              # Static assets
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 🐛 Troubleshooting

### Backend Warning: "Frontend not found"
**Síntoma**: `⚠️ Frontend not found at .../frontend/dist` en la consola del backend

**Solución**: Esto es **normal en desarrollo**. El backend busca el build del frontend solo para producción. En desarrollo:
- El frontend se sirve desde Vite (localhost:5173)
- El backend está en modo API-only (localhost:4567)
- Ignora este warning

### Login No Funciona
**Síntoma**: Error al hacer login o tokens no se guardan

**Solución**:
1. Verifica que Docker esté corriendo: `pnpm docker:dev`
2. Verifica que el backend esté corriendo: `pnpm dev:server`
3. Verifica que el frontend esté corriendo: `pnpm dev:frontend`
4. Revisa las credenciales por defecto (admin/admin o user/user)
5. Verifica la consola del navegador para errores

### CORS Errors
**Síntoma**: CORS policy errors en el navegador

**Solución**: Verifica que:
1. El backend acepte `localhost:5173` en CORS (ya configurado)
2. Las variables de entorno estén correctas
3. No estés usando el puerto 3000 por error

### Database Connection Failed
**Síntoma**: Error conectando a PostgreSQL

**Solución**:
1. Verifica que Docker esté corriendo: `docker ps`
2. Verifica el archivo `.env` en `server/`:
   - `DATABASE_URL` debe usar `localhost:5432` (no `postgres:5432`)
3. Recrea los contenedores: `pnpm docker:dev:down && pnpm docker:dev`

### Migrations Failed
**Síntoma**: Error ejecutando migraciones de Prisma

**Solución**:
1. Espera unos segundos después de levantar Docker
2. Ejecuta manualmente: `cd server && pnpm db:migrate`
3. Si persiste, resetea la BD: `cd server && pnpm db:reset`

### Frontend Build Failed
**Síntoma**: Error al buildear el frontend

**Solución**:
1. Limpia node_modules: `pnpm clean && pnpm install:all`
2. Verifica que los alias de TypeScript estén configurados
3. Asegúrate de usar Node >= 22

## 📄 License

ISC

## 🎵 Happy Coding!
