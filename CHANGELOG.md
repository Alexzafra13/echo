# Changelog

All notable changes to Echo are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Smart crossfade option: the fade starts where the loudness analysis detected the real end of the song (`outroStart`) instead of a fixed number of seconds before the end.
- `POST /api/scanner/lufs-start` starts the loudness analysis of pending tracks on demand; the Library Analysis toggle calls it when enabled.
- Volume normalization in the web player: each track is attenuated according to the ReplayGain value from the library LUFS analysis, so songs play at an even loudness (on by default, toggle in Settings → Playback). Only attenuates; nothing is amplified.
- Crossfade length is configurable again (1–12 s) from Settings → Playback.

### Changed

- Loudness (LUFS) analysis is now off by default and must be enabled from Settings → Library Analysis.
- The player volume is remembered between sessions.
- When an album is played from start to end, normalization uses the album gain so the volume differences between its tracks are preserved.
- Playback is not resumed automatically if the system interrupted it more than ten minutes ago.
- The system media notification shows previous/next track instead of ±15 s seek buttons (seekbackward/seekforward handlers are no longer registered).
- On iOS the player no longer attempts a crossfade (volume is hardware-only, so both tracks played at full volume); the gapless transition is used instead.
- A crossfade that starts while the app is in the background switches tracks immediately instead of leaving the new track at volume 0 until the fade timer fires.

### Fixed

- Playback resumes when the PWA comes back to the foreground after the system paused it (call, voice message, another app), based on whether the user had pressed play rather than on the element state.
- An audio element the browser resumes on its own after an interruption no longer plays on top of the current track: parked elements are muted and a stray `play` on the inactive element is paused.
- The next track in a gapless transition could start muted on iOS.

## [1.1.1] - 2026-09-15

### Changed

- Connecting, syncing and removing federated servers now requires an admin account (the web only ever exposed it from the admin panel).
- `pnpm swagger:generate` runs through `ts-node` so decorator metadata is available, and tolerates the teardown of an app that was never started.
- Docs aligned with the `echo_data` named volume used by `docker-compose.yml`; the configuration reference is rewritten from the variables the server actually reads; the Synology guide is linked from the README.

### Removed

- `GET /api/albums/favorites` and the "My favorites" album sort in the web: album favorites had been dropped and the endpoint always returned an empty list.
- Dead `db:seed` script, stale `jest-e2e.json`, unused settings shims and the unused DailyMix page.

### Fixed

- `COVERART_ENABLED=false` is now honoured (the value arrives as a string and was always truthy).
- 403 responses raised by the must-change-password interceptor keep the `mustChangePassword` flag, so the web redirects to the first-login screen again.
- Swagger reports the real package version and documents the `genres` tag; `swagger.json` regenerated.
- Admin "Server" tab translated (en/es/fr); missing translation keys in the queue, logs and rating components; leftover untranslated strings in the admin panel; metadata notifications link to the right admin tabs.
- Test suites type-check again (`tsc --noEmit` over `src` and `test`), and the pending "must change password" end-to-end test is implemented.

### Security

- Admin settings endpoints no longer return, update or delete secret-type settings (auto-generated JWT secrets).
- Federation refuses loopback and link-local addresses in production.

## [1.1.0] - 2026-04-18

### Added

- `/genres` module: list genres with track, album and artist counts, genre detail, and albums, tracks and artists filtered by genre. Genres come from the ID3 tags, each with a slug, a deterministic color and the cover of its most-played album.

### Changed

- Genre palette shared between Wave Mix and `/genres`; new `slugify` utility.
- The scanner invalidates the genres cache when a scan finishes.

## [1.0.8] - 2026-04-16

### Added

- Setup wizard: optional Integrations step to store Last.fm and Fanart.tv API keys (`POST /api/setup/api-keys`).
- Setup wizard: admin step can reset the existing admin (`DELETE /api/setup/admin`) and shows completed steps when navigating back.
- `GET /api/setup/status` exposes the admin username, avatar state and masked API key hints.

### Changed

- Animated transitions between wizard steps, progress bubbles and progress line; `prefers-reduced-motion` respected.
- Wizard state (admin username, selected folder, saved keys) persists when going back.
- Buttons use a slightly smaller border radius.

## [1.0.7] - 2026-04-15

### Added

- Setup wizard: "New folder" button in the library step (`POST /api/setup/browse/mkdir`) and a password strength meter.

### Fixed

- Federation: access token permissions were cached before the update was committed, so toggling "allow downloads" could appear not to apply for up to 5 minutes.
- Setup wizard: admin form inputs were rendered without spacing.

## [1.0.6] - 2026-04-15

### Fixed

- Docker healthcheck uses `127.0.0.1` instead of `localhost` (Alpine resolves `localhost` to IPv6 only).
- Entrypoint derives the PostgreSQL host and port from `DATABASE_URL` and reads `REDIS_HOST`/`REDIS_PORT` instead of hardcoded container names.
- CRLF line endings stripped from all bundled scripts when the image is built on Windows.

## [1.0.5] - 2026-04-15

### Added

- `docs/synology.md` covering the common Container Manager failures (bridge DNS, DSM firewall, slow disk initialization).
- Entrypoint verifies database credentials with a real query (`wait-for-db.js`) before running migrations, and logs DNS resolution every 10 retries.
- Bare-metal installer: progress spinner for long steps, `ECHO_ASSUME_YES=1` for unattended installs, captured output on failed steps.

### Fixed

- Bare-metal installer prompts work when run through `curl | sudo bash`.
- PostgreSQL healthcheck `start_period` extended for slow NAS storage.
- `pnpm deploy --legacy` restored (required by pnpm 10).

## [1.0.4] - 2026-04-12

### Added

- `PUID`/`PGID` support in the container entrypoint (NAS permission mapping).
- Bare-metal installer: Redis dependency and crash-loop protection in the systemd unit, `LIBRARY_PATH` in `.env`, `.env` backup on reinstall and build rollback on failed updates.

### Changed

- `docker-compose.yml`: `shm_size: 256m` for PostgreSQL, Redis `maxmemory 128mb` with LRU eviction, log rotation for all containers and `stop_grace_period` for clean shutdowns.
- CI: per-worker test databases for integration tests, longer timeouts and artifact retention, correct `BUILD_DATE` on published images.

## [1.0.3] - 2026-04-08

### Changed

- Entrypoint wait loops time out with a diagnostic message instead of hanging forever.
- Compose file simplified for NAS, Windows and macOS (no default `/mnt`/`/media` mounts).
- Bare-metal installer runs as the invoking user instead of a dedicated system user.

### Fixed

- Bare-metal installer: `pg_hba.conf` authentication and database name consistency.
- CI: Docker smoke test waits on the healthcheck; E2E setup fails explicitly if the API never starts.

## [1.0.2] - 2026-04-08

### Fixed

- Default avatar not visible in the header dropdown.
- Social hero color did not match the user's avatar.

## [1.0.1] - 2026-04-08

### Changed

- Plug-and-play start: `docker-compose.yml` ships default passwords for the internal PostgreSQL and Redis services and JWT secrets are generated by the entrypoint, so no `.env` is needed.
- Stream token cache TTL raised from 5 minutes to 1 hour; DJ WASM workers recycled more often.

### Fixed

- Scanner: album ReplayGain computed even when the last track fails, Redis lock released when enqueueing fails, cover art extracted from later tracks when the first has none.
- Streaming: `Range` header validated against NaN and negative values.
- Play tracking no longer increments the play count on skips.
- DJ analysis retries with exponential backoff.
- Image endpoints excluded from the rate limiter; WebSocket throttle lowered to 10 events/s.
- Own private profile viewable; user avatar missing from the header menu.

### Security

- `mediaSrc` restricted to HTTPS in production.

## [1.0.0] - 2026-04-07

### Added

- Initial release: library scanning, web player, smart playlists, DJ mode, LUFS analysis, metadata enrichment, social features, federation, internet radio, notifications, multi-user, themes, i18n (en/es/fr) and PWA.

[Unreleased]: https://github.com/Alexzafra13/echo/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/Alexzafra13/echo/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/Alexzafra13/echo/compare/v1.0.8...v1.1.0
[1.0.8]: https://github.com/Alexzafra13/echo/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/Alexzafra13/echo/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/Alexzafra13/echo/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/Alexzafra13/echo/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/Alexzafra13/echo/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/Alexzafra13/echo/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/Alexzafra13/echo/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/Alexzafra13/echo/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Alexzafra13/echo/releases/tag/v1.0.0
