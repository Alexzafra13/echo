<p align="center">
  <img src="web/public/images/logos/echo_dark.svg" alt="Echo" width="200" />
</p>

<p align="center">
  <b>Serveur de streaming musical auto-heberge</b>
</p>

<p align="center">
  <a href="https://github.com/Alexzafra13/echo/actions"><img src="https://github.com/Alexzafra13/echo/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/Alexzafra13/echo/pkgs/container/echo"><img src="https://img.shields.io/badge/ghcr.io-echo-blue?logo=docker" alt="Docker"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen?logo=node.js" alt="Node">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licence-GPL--3.0-blue" alt="Licence"></a>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <b>Français</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/langues_de_l'app-English%20%7C%20Espa%C3%B1ol%20%7C%20Fran%C3%A7ais-blueviolet" alt="Langues de l'app">
</p>

---

Echo est un serveur de musique personnel que vous hebergez vous-meme. Pointez-le vers votre bibliotheque musicale et ecoutez depuis n'importe ou grace a une interface web moderne.

Contrairement a d'autres serveurs de musique, Echo est **social et connecte** — partagez votre activite d'ecoute avec vos amis, connectez plusieurs serveurs Echo via la federation et redecouvrez des perles oubliees dans votre propre bibliotheque grace aux playlists intelligentes.

<!-- TODO: Ajouter des captures d'ecran
<p align="center">
  <img src="docs/screenshots/player.png" alt="Echo Player" width="800" />
</p>
-->

## Fonctionnalites

- **Scan de bibliotheque** — Indexe automatiquement vos fichiers musicaux (MP3, FLAC, AAC, OGG, WAV et plus)
- **Lecteur web** — Lecteur complet avec file d'attente, playlists et lecture sans coupure
- **Clips musicaux** — Regardez les clips musicaux lies aux pistes de votre bibliotheque
- **Playlists intelligentes** — Mix generes par algorithme : Wave Mix, Daily Mix et playlists intelligentes personnalisees
- **Mode DJ** — Mixage automatique avec analyse d'energie et de tempo
- **Analyse audio** — Normalisation du volume LUFS via Essentia.js
- **Enrichissement des metadonnees** — Recupere les biographies, images et pochettes depuis MusicBrainz, Last.fm et Fanart.tv
- **Social** — Amis, activite d'ecoute et profils publics
- **Federation** — Connectez plusieurs serveurs Echo et ecoutez de la musique entre eux
- **Radio** — Parcourez et ecoutez des stations de radio internet avec metadonnees en direct
- **Explorer** — Decouvrez les albums non ecoutes, les perles oubliees et les pistes cachees de votre bibliotheque
- **Notifications** — Alertes en temps reel pour les evenements sociaux et systeme
- **Multi-utilisateur** — Comptes utilisateur avec roles, avatars et preferences individuelles
- **Temps reel** — Mises a jour en direct via WebSocket pour l'activite sociale et les metadonnees radio
- **Themes** — Mode clair et sombre
- **i18n** — Anglais, espagnol et francais
- **PWA** — Installable comme application sur tout appareil

## Traductions

Echo est disponible dans les langues suivantes :

| Langue   | Progression                                              | Cles        |
| -------- | -------------------------------------------------------- | ----------- |
| English  | ![100%](https://img.shields.io/badge/100%25-brightgreen) | 1733 / 1733 |
| Español  | ![100%](https://img.shields.io/badge/100%25-brightgreen) | 1733 / 1733 |
| Français | ![100%](https://img.shields.io/badge/100%25-brightgreen) | 1733 / 1733 |

Vous souhaitez ajouter une nouvelle langue ? Copiez `web/src/shared/i18n/locales/en.json`, traduisez-le et ouvrez une Pull Request.

## Demarrage Rapide

### Docker (recommande)

```bash
mkdir echo && cd echo
curl -O https://raw.githubusercontent.com/Alexzafra13/echo/main/docker-compose.yml
```

Editez `docker-compose.yml` et configurez les chemins de votre musique (cherchez `>>> YOUR MUSIC`) :

```yaml
volumes:
  - ./data:/app/data
  - /chemin/vers/votre/musique:/music:ro
```

```bash
docker compose up -d
```

Ouvrez **http://localhost:4567** et creez votre compte administrateur.

### Linux (sans Docker)

```bash
curl -fsSL https://raw.githubusercontent.com/Alexzafra13/echo/main/scripts/install.sh | sudo bash
```

Consultez le guide d'[Installation Linux](docs/bare-metal.md) pour plus de details.

## Documentation

| Guide                                    | Description                                                |
| ---------------------------------------- | ---------------------------------------------------------- |
| [Installation Linux](docs/bare-metal.md) | Installer sur Linux sans Docker                            |
| [Configuration](docs/configuration.md)   | Variables d'environnement, volumes et ports                |
| [Proxy Inverse](docs/reverse-proxy.md)   | HTTPS avec Caddy, Nginx, Traefik ou Cloudflare Tunnel      |
| [Sauvegardes](docs/backup.md)            | Sauvegarde, restauration et migration de serveur           |
| [Base de Donnees](docs/database.md)      | Relations d'entites et schema general                      |
| [Architecture](docs/architecture.md)     | Diagrammes systeme, flux de requetes et strategie de cache |
| [Developpement](docs/development.md)     | Configuration locale, commandes et tests                   |

## Stack Technique

| Couche       | Technologies                                                 |
| ------------ | ------------------------------------------------------------ |
| **Backend**  | NestJS, Fastify, Drizzle ORM, PostgreSQL 16, Redis 7, BullMQ |
| **Frontend** | React 18, Vite, TypeScript, Zustand, TanStack Query, Wouter  |
| **Infra**    | Docker, Nginx, GitHub Actions, pnpm workspaces               |

## Commandes Courantes

```bash
docker compose up -d            # Demarrer
docker compose down             # Arreter
docker compose logs -f echo     # Voir les logs
docker compose restart echo     # Redemarrer
docker compose pull && docker compose up -d  # Mettre a jour
```

## Developpement

```bash
git clone https://github.com/Alexzafra13/echo.git
cd echo
pnpm quickstart    # installe les dependances, demarre la BD, execute les migrations
pnpm dev:all       # frontend (5173) + backend (3000)
```

Documentation de l'API disponible sur **http://localhost:3000/api/docs** (Swagger).

## Structure du Projet

```
echo/
├── api/            # Backend NestJS (Architecture Hexagonale)
│   └── src/
│       ├── features/         # Modules de domaine (25 modules)
│       ├── infrastructure/   # BD, cache, files d'attente, websocket
│       └── shared/           # Guards, decorateurs, utilitaires
├── web/            # Frontend React
│   └── src/
│       ├── features/         # Modules fonctionnels (18 modules)
│       ├── shared/           # Composants, hooks, store
│       └── app/              # Routes et providers
├── docs/           # Documentation
├── nginx/          # Configuration du proxy inverse
└── scripts/        # Scripts d'installation et utilitaires
```

## Contribuer

1. Forkez le depot
2. Creez une branche (`git checkout -b feature/ma-fonctionnalite`)
3. Executez `pnpm quickstart` pour la configuration locale
4. Faites vos modifications
5. Executez les tests (`pnpm --filter echo-api test && pnpm --filter echo-web test`)
6. Ouvrez une Pull Request

## Licence

[GPL-3.0](LICENSE)

---

<p align="center">
  <a href="https://github.com/Alexzafra13/echo/issues">Signaler un Bug</a>
  &middot;
  <a href="https://github.com/Alexzafra13/echo/issues">Demander une Fonctionnalite</a>
  &middot;
  <a href="https://github.com/Alexzafra13/echo/releases">Releases</a>
</p>
