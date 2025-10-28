# Echo Frontend

Modern music streaming frontend built with React, TypeScript, and Vite.

## Tech Stack

- **React 18+** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **React Router v6** - Routing
- **Zustand** - State management
- **TanStack Query (React Query)** - Data fetching & caching
- **Axios** - HTTP client
- **React Hook Form + Zod** - Form handling & validation
- **CSS Modules** - Scoped styling
- **Howler.js** - Audio playback
- **Lucide React** - Icon library
- **Vitest** - Testing framework

## Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── app/               # App initialization
│   │   └── App.tsx        # Main app component with routing
│   ├── features/          # Feature-based modules
│   │   └── auth/
│   │       ├── components/    # Feature-specific components
│   │       ├── pages/         # Page components
│   │       ├── services/      # API services
│   │       └── hooks/         # Custom hooks
│   ├── shared/            # Shared across features
│   │   ├── components/
│   │   │   └── ui/            # Base UI components (Button, Input, Card)
│   │   ├── styles/            # Global styles & variables
│   │   ├── hooks/             # Shared hooks
│   │   ├── services/          # Shared services (API client, auth)
│   │   ├── utils/             # Utility functions
│   │   └── types/             # TypeScript types
│   ├── assets/            # Images, fonts, etc.
│   └── main.tsx           # App entry point
├── index.html             # HTML template
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies
```

## Design System

The app uses a comprehensive design system defined in `src/shared/styles/variables.css`:

### Colors
- **Primary**: Coral (#ff7f50) - Main brand color
- **Secondary**: Teal (#22d3ee) - Accent color
- **Background**: Dark slate (#0f172a, #1e293b, #334155)

### Typography
- **Display**: Outfit (headings, titles)
- **Body**: Inter (UI text, paragraphs)

### Components
All base UI components are in `src/shared/components/ui/`:
- **Button** - With variants (primary, secondary, outline, ghost)
- **Input** - With icons, error states, and validation
- **Card** - Container with multiple variants

## Getting Started

### Prerequisites
- Node.js 18+ or pnpm 8+

### Installation

```bash
cd frontend
pnpm install
```

### Development

```bash
pnpm dev
```

Runs at [http://localhost:5173](http://localhost:5173)

API requests to `/api/*` are proxied to `http://localhost:3000` (backend).

### Build

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

### Testing

```bash
# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage
```

### Linting

```bash
pnpm lint
```

## Path Aliases

The following path aliases are configured:

- `@/*` → `src/*`
- `@app/*` → `src/app/*`
- `@features/*` → `src/features/*`
- `@shared/*` → `src/shared/*`
- `@assets/*` → `src/assets/*`

Example:
```typescript
import { Button } from '@shared/components/ui';
import LoginPage from '@features/auth/pages/LoginPage';
```

## CSS Modules

All component styles use CSS Modules for scoped styling:

```typescript
import styles from './Component.module.css';

<div className={styles.container}>...</div>
```

Combine with `clsx` for conditional classes:

```typescript
import clsx from 'clsx';

<div className={clsx(styles.button, isActive && styles.active)}>
```

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:3000
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Current Features

- [x] Login page with form validation
- [ ] Authentication service
- [ ] Protected routes
- [ ] Main layout with sidebar
- [ ] Music player
- [ ] Library view
- [ ] Playlists management
- [ ] Search functionality

## Contributing

1. Create a new feature branch
2. Follow the existing code structure
3. Use TypeScript strictly (no `any` unless necessary)
4. Write tests for new features
5. Follow the design system variables
6. Use semantic commit messages

## Notes

- All pages are responsive (mobile-first approach)
- Dark theme by default (light theme prepared but not implemented)
- Accessibility: All interactive elements have proper ARIA labels
- Forms use React Hook Form + Zod for validation
- API calls should use TanStack Query for caching
