<p align="center">
  <img src="web/public/images/logos/echo_dark.svg" alt="Echo" width="200" />
</p>

<p align="center">
  <b>Self-hosted music streaming server</b>
</p>

<p align="center">
  <a href="https://github.com/Alexzafra13/echo/actions"><img src="https://github.com/Alexzafra13/echo/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/Alexzafra13/echo/pkgs/container/echo"><img src="https://img.shields.io/badge/ghcr.io-echo-blue?logo=docker" alt="Docker"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen?logo=node.js" alt="Node">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License"></a>
</p>

<p align="center">
  <b>English</b> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/app_languages-English%20%7C%20Espa%C3%B1ol%20%7C%20Fran%C3%A7ais-blueviolet" alt="App Languages">
</p>

---

Echo is a personal music server that you host yourself. Point it at your music library and stream anywhere from a modern web interface.

Unlike other music servers, Echo is **social and connected** — share listening activity with friends, connect multiple Echo servers via federation, and discover forgotten gems in your own library with algorithm-driven smart playlists.

<!-- TODO: Add screenshots
<p align="center">
  <img src="docs/screenshots/player.png" alt="Echo Player" width="800" />
</p>
-->

## Features

- **Library scanning** — Indexes your music files automatically (MP3, FLAC, AAC, OGG, WAV and more)
- **Web player** — Full-featured player with queue, playlists, and gapless-like playback
- **Music videos** — Watch music videos linked to tracks in your library
- **Smart playlists** — Algorithm-driven mixes: Wave Mix, Daily Mix, and custom smart playlists
- **DJ mode** — Automatic mixing with energy and tempo analysis
- **Audio analysis** — LUFS loudness normalization via Essentia.js
- **Metadata enrichment** — Pulls artist bios, images, and covers from MusicBrainz, Last.fm, and Fanart.tv
- **Social** — Friends, listening activity, and public profiles
- **Federation** — Connect multiple Echo servers and stream music across them
- **Radio** — Browse and stream internet radio stations with live metadata
- **Explore** — Discover unplayed albums, forgotten gems, and hidden tracks in your library
- **Notifications** — Real-time alerts for social events and system updates
- **Multi-user** — User accounts with roles, avatars, and per-user preferences
- **Real-time** — WebSocket-powered live updates for social activity and radio metadata
- **Themes** — Light and dark mode
- **i18n** — English, Spanish, and French
- **PWA** — Installable as an app on any device

## Translations

Echo is available in the following languages:

| Language | Progress                                                 | Keys        |
| -------- | -------------------------------------------------------- | ----------- |
| English  | ![100%](https://img.shields.io/badge/100%25-brightgreen) | 1733 / 1733 |
| Español  | ![100%](https://img.shields.io/badge/100%25-brightgreen) | 1733 / 1733 |
| Français | ![100%](https://img.shields.io/badge/100%25-brightgreen) | 1733 / 1733 |

Want to add a new language? Copy `web/src/shared/i18n/locales/en.json`, translate it, and open a Pull Request.

## Quick Start

### Docker (recommended)

```bash
mkdir echo && cd echo
curl -O https://raw.githubusercontent.com/Alexzafra13/echo/main/docker-compose.yml
```

Edit `docker-compose.yml` and set your music paths (look for `>>> YOUR MUSIC`):

```yaml
volumes:
  - ./data:/app/data
  - /path/to/your/music:/music:ro
```

```bash
docker compose up -d
```

Open **http://localhost:4567** and create your admin account.

### Linux (without Docker)

```bash
curl -fsSL https://raw.githubusercontent.com/Alexzafra13/echo/main/scripts/install.sh | sudo bash
```

See the [Linux Install](docs/bare-metal.md) guide for details.

## Documentation

| Guide                                  | Description                                                  |
| -------------------------------------- | ------------------------------------------------------------ |
| [Linux Install](docs/bare-metal.md)    | Install on Linux without Docker                              |
| [Configuration](docs/configuration.md) | Environment variables, volumes, and ports                    |
| [Reverse Proxy](docs/reverse-proxy.md) | HTTPS setup with Caddy, Nginx, Traefik, or Cloudflare Tunnel |
| [Backups](docs/backup.md)              | Backup, restore, and server migration                        |
| [Database](docs/database.md)           | Entity relationships and schema overview                     |
| [Architecture](docs/architecture.md)   | System diagrams, request flow, and caching strategy          |
| [Development](docs/development.md)     | Local setup, commands, and testing                           |

## Tech Stack

| Layer        | Technologies                                                 |
| ------------ | ------------------------------------------------------------ |
| **Backend**  | NestJS, Fastify, Drizzle ORM, PostgreSQL 16, Redis 7, BullMQ |
| **Frontend** | React 18, Vite, TypeScript, Zustand, TanStack Query, Wouter  |
| **Infra**    | Docker, Nginx, GitHub Actions, pnpm workspaces               |

## Common Commands

```bash
docker compose up -d            # Start
docker compose down             # Stop
docker compose logs -f echo     # View logs
docker compose restart echo     # Restart
docker compose pull && docker compose up -d  # Update
```

## Development

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
pnpm quickstart    # installs deps, starts DB, runs migrations
pnpm dev:all       # frontend (5173) + backend (3000)
```

API docs available at **http://localhost:3000/api/docs** (Swagger).

## Project Structure

```
echo/
├── api/            # NestJS backend (Hexagonal Architecture)
│   └── src/
│       ├── features/         # Domain modules (25 modules)
│       ├── infrastructure/   # DB, cache, queue, websocket
│       └── shared/           # Guards, decorators, utils
├── web/            # React frontend
│   └── src/
│       ├── features/         # Feature modules (18 modules)
│       ├── shared/           # Components, hooks, store
│       └── app/              # Routing and providers
├── docs/           # User-facing documentation
├── nginx/          # Production reverse proxy config
└── scripts/        # Setup and utility scripts
```

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Run `pnpm quickstart` for local setup
4. Make your changes
5. Run tests (`pnpm --filter echo-api test && pnpm --filter echo-web test`)
6. Open a Pull Request

## License

[GPL-3.0](LICENSE)

---

<p align="center">
  <a href="https://github.com/Alexzafra13/echo/issues">Report a Bug</a>
  &middot;
  <a href="https://github.com/Alexzafra13/echo/issues">Request a Feature</a>
  &middot;
  <a href="https://github.com/Alexzafra13/echo/releases">Releases</a>
</p>
