<p align="center">
  <img src="web/public/images/logos/echo_dark.svg" alt="Echo" width="200" />
</p>

<p align="center">
  <b>Servidor de streaming de música autoalojado</b>
</p>

<p align="center">
  <a href="https://github.com/Alexzafra13/echo/actions"><img src="https://github.com/Alexzafra13/echo/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/Alexzafra13/echo/pkgs/container/echo"><img src="https://img.shields.io/badge/ghcr.io-echo-blue?logo=docker" alt="Docker"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen?logo=node.js" alt="Node">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licencia-GPL--3.0-blue" alt="Licencia"></a>
</p>

<p align="center">
  <a href="README.md">English</a> | <b>Español</b> | <a href="README.fr.md">Français</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/idiomas_de_la_app-English%20%7C%20Espa%C3%B1ol%20%7C%20Fran%C3%A7ais-blueviolet" alt="Idiomas de la app">
</p>

---

Echo es un servidor de música personal que alojas en tu propio hardware. Apunta a tu biblioteca musical y escucha desde cualquier lugar con una interfaz web moderna.

A diferencia de otros servidores de música, Echo es **social y conectado** — comparte tu actividad de escucha con amigos, conecta varios servidores Echo mediante federación y redescubre joyas olvidadas en tu propia biblioteca con playlists inteligentes.

<!-- TODO: Añadir capturas
<p align="center">
  <img src="docs/screenshots/player.png" alt="Echo Player" width="800" />
</p>
-->

## Funcionalidades

- **Escaneo de biblioteca** — Indexa tus archivos de música automáticamente (MP3, FLAC, AAC, OGG, WAV y más)
- **Reproductor web** — Reproductor completo con cola, playlists y reproducción sin cortes
- **Videoclips** — Mira videoclips vinculados a las canciones de tu biblioteca
- **Playlists inteligentes** — Mixes generados por algoritmo: Wave Mix, Daily Mix y playlists inteligentes personalizadas
- **Modo DJ** — Mezcla automática con análisis de energía y tempo
- **Análisis de audio** — Normalización de volumen LUFS con Essentia.js
- **Enriquecimiento de metadatos** — Obtiene biografías, imágenes y carátulas de MusicBrainz, Last.fm y Fanart.tv
- **Social** — Amigos, actividad de escucha y perfiles públicos
- **Federación** — Conecta varios servidores Echo y reproduce música entre ellos
- **Radio** — Explora y escucha emisoras de radio por internet con metadatos en vivo
- **Explorar** — Descubre álbumes sin escuchar, joyas olvidadas y canciones ocultas en tu biblioteca
- **Notificaciones** — Alertas en tiempo real para eventos sociales y del sistema
- **Multiusuario** — Cuentas de usuario con roles, avatares y preferencias individuales
- **Tiempo real** — Actualizaciones en vivo por WebSocket para actividad social y metadatos de radio
- **Temas** — Modo claro y oscuro
- **i18n** — Inglés, español y francés
- **PWA** — Instalable como app en cualquier dispositivo

## Traducciones

Echo está disponible en los siguientes idiomas:

| Idioma   | Progreso                                                 | Claves      |
| -------- | -------------------------------------------------------- | ----------- |
| English  | ![100%](https://img.shields.io/badge/100%25-brightgreen) | 1733 / 1733 |
| Español  | ![100%](https://img.shields.io/badge/100%25-brightgreen) | 1733 / 1733 |
| Français | ![100%](https://img.shields.io/badge/100%25-brightgreen) | 1733 / 1733 |

¿Quieres añadir un nuevo idioma? Copia `web/src/shared/i18n/locales/en.json`, tradúcelo y abre un Pull Request.

## Inicio Rápido

### Docker (recomendado)

```bash
mkdir echo && cd echo
curl -O https://raw.githubusercontent.com/Alexzafra13/echo/main/docker-compose.yml
```

Edita `docker-compose.yml` y configura las rutas de tu música (busca `>>> YOUR MUSIC`):

```yaml
volumes:
  - ./data:/app/data
  - /ruta/a/tu/musica:/music:ro
```

```bash
docker compose up -d
```

Abre **http://localhost:4567** y crea tu cuenta de administrador.

### Linux (sin Docker)

```bash
curl -fsSL https://raw.githubusercontent.com/Alexzafra13/echo/main/scripts/install.sh | sudo bash
```

Consulta la guía de [Instalación en Linux](docs/bare-metal.md) para más detalles.

## Documentación

| Guía                                       | Descripción                                                      |
| ------------------------------------------ | ---------------------------------------------------------------- |
| [Instalación en Linux](docs/bare-metal.md) | Instalar en Linux sin Docker                                     |
| [Configuración](docs/configuration.md)     | Variables de entorno, volúmenes y puertos                        |
| [Proxy Inverso](docs/reverse-proxy.md)     | HTTPS con Caddy, Nginx, Traefik o Cloudflare Tunnel              |
| [Copias de Seguridad](docs/backup.md)      | Backup, restauración y migración de servidor                     |
| [Base de Datos](docs/database.md)          | Relaciones de entidades y esquema general                        |
| [Arquitectura](docs/architecture.md)       | Diagramas del sistema, flujo de peticiones y estrategia de caché |
| [Desarrollo](docs/development.md)          | Configuración local, comandos y testing                          |

## Stack Tecnológico

| Capa         | Tecnologías                                                  |
| ------------ | ------------------------------------------------------------ |
| **Backend**  | NestJS, Fastify, Drizzle ORM, PostgreSQL 16, Redis 7, BullMQ |
| **Frontend** | React 18, Vite, TypeScript, Zustand, TanStack Query, Wouter  |
| **Infra**    | Docker, Nginx, GitHub Actions, pnpm workspaces               |

## Comandos Comunes

```bash
docker compose up -d            # Iniciar
docker compose down             # Parar
docker compose logs -f echo     # Ver logs
docker compose restart echo     # Reiniciar
docker compose pull && docker compose up -d  # Actualizar
```

## Desarrollo

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
pnpm quickstart    # instala dependencias, levanta BD, ejecuta migraciones
pnpm dev:all       # frontend (5173) + backend (3000)
```

Documentación de la API disponible en **http://localhost:3000/api/docs** (Swagger).

## Estructura del Proyecto

```
echo/
├── api/            # Backend NestJS (Arquitectura Hexagonal)
│   └── src/
│       ├── features/         # Módulos de dominio (25 módulos)
│       ├── infrastructure/   # BD, caché, colas, websocket
│       └── shared/           # Guards, decoradores, utilidades
├── web/            # Frontend React
│   └── src/
│       ├── features/         # Módulos funcionales (18 módulos)
│       ├── shared/           # Componentes, hooks, store
│       └── app/              # Rutas y providers
├── docs/           # Documentación
├── nginx/          # Configuración de proxy inverso
└── scripts/        # Scripts de instalación y utilidades
```

## Contribuir

1. Haz un fork del repositorio
2. Crea una rama (`git checkout -b feature/mi-feature`)
3. Ejecuta `pnpm quickstart` para la configuración local
4. Haz tus cambios
5. Ejecuta los tests (`pnpm --filter echo-api test && pnpm --filter echo-web test`)
6. Abre un Pull Request

## Licencia

[GPL-3.0](LICENSE)

---

<p align="center">
  <a href="https://github.com/Alexzafra13/echo/issues">Reportar un Bug</a>
  &middot;
  <a href="https://github.com/Alexzafra13/echo/issues">Solicitar una Funcionalidad</a>
  &middot;
  <a href="https://github.com/Alexzafra13/echo/releases">Releases</a>
</p>
