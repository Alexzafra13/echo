# Echo API - Documentación de Endpoints

Esta documentación describe todos los endpoints disponibles en el backend de Echo, organizados por módulo/funcionalidad.

## Tabla de Contenidos

- [Autenticación](#autenticación)
- [Usuarios](#usuarios)
- [Administración de Usuarios](#administración-de-usuarios)
- [Álbumes](#álbumes)
- [Artistas](#artistas)
- [Tracks](#tracks)
- [Playlists](#playlists)
- [Explorar](#explorar)
- [Historial de Reproducción](#historial-de-reproducción)
- [Recomendaciones](#recomendaciones)
- [Social](#social)
- [Interacciones de Usuario](#interacciones-de-usuario)
- [Streaming de Audio](#streaming-de-audio)
- [Tokens de Stream](#tokens-de-stream)
- [Radio](#radio)
- [Scanner de Biblioteca](#scanner-de-biblioteca)
- [Configuración Inicial](#configuración-inicial)
- [Metadatos Externos](#metadatos-externos)
- [Imágenes](#imágenes)
- [Dashboard Admin](#dashboard-admin)
- [Logs del Sistema](#logs-del-sistema)
- [Perfiles Públicos](#perfiles-públicos)
- [Health Check](#health-check)

---

## Autenticación

**Archivo:** `src/features/auth/presentation/auth.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `POST` | `/auth/login` | Iniciar sesión con usuario/contraseña | Público (Rate limit: 50 req/min) |
| `POST` | `/auth/refresh` | Refrescar tokens JWT | Requerida |
| `GET` | `/auth/me` | Obtener perfil del usuario autenticado | Requerida |

---

## Usuarios

**Archivo:** `src/features/users/presentation/users.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `PUT` | `/users/password` | Cambiar contraseña del usuario | Requerida |
| `PUT` | `/users/profile` | Actualizar perfil (nombre) | Requerida |
| `PUT` | `/users/theme` | Cambiar tema de UI (light/dark) | Requerida |
| `PUT` | `/users/language` | Cambiar idioma de UI (es/en) | Requerida |
| `POST` | `/users/avatar` | Subir avatar (multipart, máx 5MB) | Requerida |
| `DELETE` | `/users/avatar` | Eliminar avatar | Requerida |
| `GET` | `/users/privacy` | Obtener configuración de privacidad | Requerida |
| `PUT` | `/users/privacy` | Actualizar configuración de privacidad | Requerida |
| `GET` | `/users/home-preferences` | Obtener preferencias de secciones del home | Requerida |
| `PUT` | `/users/home-preferences` | Actualizar preferencias de secciones del home | Requerida |

---

## Administración de Usuarios

**Archivo:** `src/features/admin/presentation/admin.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `POST` | `/admin/users` | Crear nuevo usuario | Admin |
| `GET` | `/admin/users` | Listar usuarios con paginación | Admin |
| `PUT` | `/admin/users/:id` | Actualizar información de usuario | Admin |
| `DELETE` | `/admin/users/:id` | Eliminar usuario (soft delete) | Admin |
| `DELETE` | `/admin/users/:id/permanently` | Eliminar usuario permanentemente | Admin |
| `POST` | `/admin/users/:id/reset-password` | Resetear contraseña de usuario | Admin |

---

## Álbumes

**Archivo:** `src/features/albums/presentation/controller/albums.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/albums` | Listar álbumes con paginación | Opcional |
| `GET` | `/albums/recent` | Obtener álbumes añadidos recientemente | Opcional |
| `GET` | `/albums/top-played` | Obtener álbumes más reproducidos | Opcional |
| `GET` | `/albums/alphabetical` | Obtener álbumes ordenados alfabéticamente | Requerida |
| `GET` | `/albums/recently-played` | Obtener álbumes reproducidos recientemente | Requerida |
| `GET` | `/albums/favorites` | Obtener álbumes favoritos del usuario | Requerida |
| `GET` | `/albums/featured` | Obtener álbum destacado para hero section | Opcional |
| `GET` | `/albums/search/:query` | Buscar álbumes por nombre | Opcional |
| `GET` | `/albums/:id` | Obtener álbum por ID | Opcional |
| `GET` | `/albums/:id/tracks` | Obtener tracks de un álbum | Opcional |
| `GET` | `/albums/:id/cover` | Obtener carátula del álbum (imagen) | Público |

---

## Artistas

**Archivo:** `src/features/artists/presentation/controller/artists.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/artists` | Listar artistas con paginación | Opcional |
| `GET` | `/artists/search/:query` | Buscar artistas por nombre | Opcional |
| `GET` | `/artists/:id` | Obtener artista por ID | Opcional |
| `GET` | `/artists/:id/albums` | Obtener álbumes de un artista | Opcional |

---

## Tracks

**Archivo:** `src/features/tracks/presentation/controller/tracks.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/tracks` | Listar tracks con paginación | Opcional |
| `GET` | `/tracks/search/:query` | Buscar tracks por título | Opcional |
| `GET` | `/tracks/shuffle` | Obtener tracks aleatorios con seed determinístico | Opcional |
| `GET` | `/tracks/:id` | Obtener track por ID | Opcional |

---

## Playlists

**Archivo:** `src/features/playlists/presentation/controller/playlists.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `POST` | `/playlists` | Crear nueva playlist | Requerida |
| `GET` | `/playlists` | Listar playlists del usuario | Requerida |
| `GET` | `/playlists/:id` | Obtener playlist por ID | Requerida |
| `PATCH` | `/playlists/:id` | Actualizar metadatos de playlist | Requerida |
| `DELETE` | `/playlists/:id` | Eliminar playlist | Requerida |
| `GET` | `/playlists/:id/tracks` | Obtener tracks de una playlist | Requerida |
| `POST` | `/playlists/:id/tracks` | Añadir track a playlist | Requerida |
| `DELETE` | `/playlists/:id/tracks/:trackId` | Eliminar track de playlist | Requerida |
| `POST` | `/playlists/:id/tracks/reorder` | Reordenar tracks de playlist | Requerida |

---

## Explorar

**Archivo:** `src/features/explore/presentation/controller/explore.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/explore/unplayed` | Álbumes nunca reproducidos por el usuario | Requerida |
| `GET` | `/explore/forgotten` | Álbumes no reproducidos en meses | Requerida |
| `GET` | `/explore/hidden-gems` | Tracks menos escuchados de artistas favoritos | Requerida |
| `GET` | `/explore/random/album` | Obtener álbum aleatorio | Opcional |
| `GET` | `/explore/random/artist` | Obtener artista aleatorio | Opcional |
| `GET` | `/explore/random/albums` | Obtener múltiples álbumes aleatorios | Opcional |

---

## Historial de Reproducción

**Archivo:** `src/features/play-tracking/presentation/controller/play-tracking.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `POST` | `/play-tracking/play` | Registrar evento de reproducción | Requerida |
| `POST` | `/play-tracking/skip` | Registrar evento de skip | Requerida |
| `GET` | `/play-tracking/history` | Obtener historial de reproducciones | Requerida |
| `GET` | `/play-tracking/top-tracks` | Obtener tracks más escuchados | Requerida |
| `GET` | `/play-tracking/recently-played` | Obtener tracks reproducidos recientemente | Requerida |
| `GET` | `/play-tracking/summary` | Obtener resumen de estadísticas | Requerida |
| `PUT` | `/play-tracking/playback-state` | Actualizar estado de reproducción actual ("listening now") | Requerida |

---

## Recomendaciones

**Archivo:** `src/features/recommendations/presentation/controller/recommendations.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `POST` | `/recommendations/calculate-score` | Calcular puntuación inteligente de track | Requerida |
| `GET` | `/recommendations/daily-mix` | Generar playlist diaria personalizada | Requerida |
| `POST` | `/recommendations/smart-playlist` | Generar smart playlist | Requerida |
| `GET` | `/recommendations/wave-mix` | Obtener todas las playlists Wave Mix | Requerida |
| `POST` | `/recommendations/wave-mix/refresh` | Forzar actualización de Wave Mix | Requerida |
| `GET` | `/recommendations/wave-mix/artists` | Obtener playlists por artista paginadas | Requerida |
| `GET` | `/recommendations/wave-mix/genres` | Obtener playlists por género paginadas | Requerida |

---

## Social

**Archivo:** `src/features/social/presentation/controller/social.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/social` | Obtener resumen social (amigos, solicitudes, listening now) | Requerida |
| `GET` | `/social/friends` | Listar amigos del usuario | Requerida |
| `POST` | `/social/friends/request` | Enviar solicitud de amistad | Requerida |
| `POST` | `/social/friends/accept/:friendshipId` | Aceptar solicitud de amistad | Requerida |
| `DELETE` | `/social/friends/:friendshipId` | Eliminar amigo | Requerida |
| `GET` | `/social/friends/pending` | Obtener solicitudes pendientes | Requerida |
| `GET` | `/social/listening` | Obtener amigos escuchando actualmente | Requerida |
| `GET` | `/social/activity` | Obtener actividad reciente de amigos | Requerida |
| `GET` | `/social/users/search` | Buscar usuarios | Requerida |
| `GET` | `/social/listening/stream` | Stream SSE para actualizaciones de escucha en tiempo real | Público |

---

## Interacciones de Usuario

**Archivo:** `src/features/user-interactions/presentation/controller/user-interactions.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `POST` | `/interactions/like` | Toggle like en un item | Requerida |
| `POST` | `/interactions/dislike` | Toggle dislike en un item | Requerida |
| `POST` | `/interactions/rating` | Establecer rating (1-5 estrellas) | Requerida |
| `DELETE` | `/interactions/rating/:itemType/:itemId` | Eliminar rating | Requerida |
| `GET` | `/interactions/me` | Obtener interacciones del usuario | Requerida |
| `GET` | `/interactions/item/:itemType/:itemId` | Obtener resumen de interacciones de un item | Requerida |

---

## Streaming de Audio

**Archivo:** `src/features/streaming/presentation/streaming.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `HEAD` | `/tracks/:id/stream` | Obtener metadatos de audio sin contenido | Token-based |
| `GET` | `/tracks/:id/stream` | Stream de audio con soporte para range requests | Token-based |
| `GET` | `/tracks/:id/download` | Descargar track completo | Token-based |

---

## Tokens de Stream

**Archivo:** `src/features/streaming/presentation/stream-token.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `POST` | `/stream-token/generate` | Generar token de stream (expira en 30 días) | Requerida |
| `GET` | `/stream-token` | Obtener token de stream actual | Requerida |
| `DELETE` | `/stream-token` | Revocar token de stream | Requerida |

---

## Radio

**Archivo:** `src/features/radio/presentation/radio.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/radio/search` | Buscar estaciones de radio | Requerida |
| `GET` | `/radio/top-voted` | Obtener estaciones más votadas | Requerida |
| `GET` | `/radio/popular` | Obtener estaciones más populares (clicks) | Requerida |
| `GET` | `/radio/by-country/:code` | Obtener estaciones por código de país | Requerida |
| `GET` | `/radio/by-tag/:tag` | Obtener estaciones por género/tag | Requerida |
| `GET` | `/radio/tags` | Obtener todos los géneros disponibles | Requerida |
| `GET` | `/radio/countries` | Obtener países con estaciones | Requerida |
| `GET` | `/radio/favorites` | Obtener estaciones favoritas del usuario | Requerida |
| `POST` | `/radio/favorites/from-api` | Guardar estación de Radio Browser como favorita | Requerida |
| `POST` | `/radio/favorites/custom` | Crear estación de radio personalizada | Requerida |
| `DELETE` | `/radio/favorites/:id` | Eliminar estación favorita | Requerida |
| `GET` | `/radio/metadata/stream` | Stream SSE para metadatos ICY en tiempo real | Público |
| `GET` | `/radio/stream/proxy` | Proxy para streams HTTP a través de HTTPS | Público |

---

## Scanner de Biblioteca

**Archivo:** `src/features/scanner/presentation/controller/scanner.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `POST` | `/scanner/start` | Iniciar escaneo de biblioteca | Admin |
| `GET` | `/scanner/lufs-status` | Obtener estado de la cola de análisis LUFS | Admin |
| `GET` | `/scanner/:id` | Obtener estado de un escaneo específico | Admin |
| `GET` | `/scanner` | Obtener historial de escaneos | Admin |

---

## Configuración Inicial

**Archivo:** `src/features/setup/presentation/setup.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/setup/status` | Verificar estado de configuración | Público |
| `POST` | `/setup/admin` | Crear cuenta de administrador | Público (solo setup) |
| `POST` | `/setup/library` | Configurar ruta de biblioteca de música | Público (solo setup) |
| `POST` | `/setup/browse` | Explorar directorios para selección de biblioteca | Público (solo setup) |
| `POST` | `/setup/complete` | Marcar configuración como completada | Público (solo setup) |

---

## Metadatos Externos

### MusicBrainz Search

**Archivo:** `src/features/external-metadata/presentation/musicbrainz-search.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/metadata/musicbrainz/search/artists` | Buscar artistas en MusicBrainz | Requerida |
| `GET` | `/metadata/musicbrainz/search/albums` | Buscar álbumes en MusicBrainz | Requerida |
| `GET` | `/metadata/musicbrainz/artists/:mbid` | Obtener detalles de artista por MBID | Requerida |
| `GET` | `/metadata/musicbrainz/albums/:mbid` | Obtener detalles de álbum por MBID | Requerida |
| `POST` | `/metadata/musicbrainz/artists/:artistId/select` | Aplicar MBID a artista | Requerida |
| `POST` | `/metadata/musicbrainz/albums/:albumId/select` | Aplicar MBID a álbum | Requerida |
| `GET` | `/metadata/musicbrainz/artists/:artistId/suggest` | Obtener sugerencias de MBID para artista | Requerida |
| `GET` | `/metadata/musicbrainz/albums/:albumId/suggest` | Obtener sugerencias de MBID para álbum | Requerida |

### Enrichment

**Archivo:** `src/features/external-metadata/presentation/external-metadata.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `POST` | `/metadata/artists/:id/enrich` | Enriquecer artista con metadatos externos | Requerida |
| `POST` | `/metadata/albums/:id/enrich` | Enriquecer álbum con metadatos externos | Requerida |

### Auto-Search Admin

**Archivo:** `src/features/external-metadata/presentation/mbid-auto-search.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/admin/mbid-auto-search/config` | Obtener configuración de auto-búsqueda | Admin |
| `PUT` | `/admin/mbid-auto-search/config` | Actualizar configuración de auto-búsqueda | Admin |
| `GET` | `/admin/mbid-auto-search/stats` | Obtener estadísticas de auto-búsqueda | Admin |

### Admin Settings

**Archivo:** `src/features/external-metadata/presentation/admin-settings.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/admin/settings` | Obtener todas las configuraciones | Admin |
| `GET` | `/admin/settings/category/:category` | Obtener configuraciones por categoría | Admin |
| `GET` | `/admin/settings/:key` | Obtener configuración específica | Admin |
| `PUT` | `/admin/settings/:key` | Actualizar/crear configuración | Admin |
| `POST` | `/admin/settings/validate-api-key` | Validar API key externa | Admin |
| `DELETE` | `/admin/settings/:key` | Eliminar configuración | Admin |
| `POST` | `/admin/settings/browse-directories` | Explorar directorios del servidor | Admin |
| `POST` | `/admin/settings/validate-storage-path` | Validar ruta de almacenamiento | Admin |
| `POST` | `/admin/settings/cache/clear` | Limpiar caché de configuraciones | Admin |
| `POST` | `/admin/settings/agents/reload` | Recargar todos los agentes de metadatos | Admin |
| `POST` | `/admin/settings/enrichment/reset` | Resetear estado de enriquecimiento | Admin |
| `POST` | `/admin/settings/enrichment/reset-and-start` | Resetear e iniciar cola de enriquecimiento | Admin |

---

## Imágenes

**Archivo:** `src/features/external-metadata/presentation/images.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/images/artists/:artistId/:imageType` | Obtener imagen de artista (profile/background/banner/logo) | Público |
| `GET` | `/images/albums/:albumId/cover` | Obtener carátula de álbum | Público |
| `GET` | `/images/albums/:albumId/custom/:customCoverId` | Obtener carátula personalizada | Público |
| `GET` | `/images/artists/:artistId/custom/:customImageId` | Obtener imagen personalizada de artista | Público |
| `GET` | `/images/artists/:artistId/:imageType/exists` | Verificar si existe imagen de artista | Requerida |
| `GET` | `/images/albums/:albumId/cover/exists` | Verificar si existe carátula | Requerida |
| `GET` | `/images/albums/:albumId/cover/metadata` | Obtener metadatos de carátula | Requerida |
| `GET` | `/images/users/:userId/avatar` | Obtener avatar de usuario | Público |
| `GET` | `/images/artists/:artistId/all` | Obtener metadatos de todas las imágenes de artista | Requerida |

### Custom Artist Images (Admin)

**Archivo:** `src/features/admin/presentation/custom-artist-images.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/admin/metadata/artist/custom-images/:artistId` | Listar imágenes personalizadas | Admin |
| `POST` | `/admin/metadata/artist/custom-images/:artistId/upload` | Subir imagen personalizada | Admin |
| `POST` | `/admin/metadata/artist/custom-images/:artistId/apply/:customImageId` | Aplicar imagen personalizada | Admin |
| `DELETE` | `/admin/metadata/artist/custom-images/:artistId/:customImageId` | Eliminar imagen personalizada | Admin |

---

## Dashboard Admin

**Archivo:** `src/features/admin/presentation/admin-dashboard.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/admin/dashboard/stats` | Obtener estadísticas del dashboard | Admin |
| `GET` | `/admin/dashboard/health` | Obtener estado de salud del sistema | Admin |

---

## Admin Library Configuration

**Archivo:** `src/features/admin/presentation/admin-library.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/admin/library` | Obtener configuración de biblioteca | Admin |
| `PUT` | `/admin/library` | Actualizar ruta de biblioteca | Admin |
| `POST` | `/admin/library/browse` | Explorar directorios | Admin |

---

## Logs del Sistema

**Archivo:** `src/features/logs/presentation/logs.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/logs` | Obtener logs filtrados | Admin |
| `GET` | `/logs/stats` | Obtener estadísticas de logs | Admin |
| `GET` | `/logs/categories` | Obtener categorías de logs disponibles | Admin |
| `GET` | `/logs/levels` | Obtener niveles de severidad | Admin |

---

## Perfiles Públicos

**Archivo:** `src/features/public-profiles/presentation/public-profiles.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/profiles/:userId` | Obtener perfil público de usuario | Requerida |

---

## Health Check

**Archivo:** `src/features/health/health.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/health` | Verificar estado de salud de servicios | Público |

---

## Root

**Archivo:** `src/app.controller.ts`

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/` | Endpoint raíz (hello) | Público |

---

## Resumen de Autenticación

### Endpoints Públicos (Sin Autenticación)
- `GET /` - Root
- `GET /health` - Health check
- `POST /auth/login` - Login (rate-limited: 50 req/min)
- `GET /setup/*` - Solo durante fase de configuración inicial
- `GET /radio/metadata/stream` - SSE (token via query param)
- `GET /radio/stream/proxy` - Proxy de streams
- `GET /images/*` - Mayoría son públicos
- `GET /social/listening/stream` - SSE (userId via query param)
- `HEAD/GET /tracks/:id/stream` - Token-based
- `GET /tracks/:id/download` - Token-based

### Endpoints Autenticados (JWT Requerido)
- Todos los endpoints de `/users/*`
- Todos los endpoints de `/albums/*` (excepto listado/búsqueda básicos)
- Todos los endpoints de `/artists/*`
- Todos los endpoints de `/tracks/*`
- Todos los endpoints de `/playlists/*`
- Todos los endpoints de `/explore/*`
- Todos los endpoints de `/play-tracking/*`
- Todos los endpoints de `/recommendations/*`
- Todos los endpoints de `/social/*`
- Todos los endpoints de `/interactions/*`
- Todos los endpoints de `/radio/*` (excepto proxy y SSE)
- Todos los endpoints de `/metadata/*`
- Todos los endpoints de `/profiles/*`
- Todos los endpoints de `/stream-token/*`

### Endpoints Solo Admin
- `/admin/users/*` - Gestión de usuarios
- `/admin/dashboard/*` - Dashboard administrativo
- `/admin/library/*` - Configuración de biblioteca
- `/admin/settings/*` - Configuraciones del sistema
- `/admin/mbid-auto-search/*` - Auto-búsqueda de metadatos
- `/admin/metadata/artist/custom-images/*` - Imágenes personalizadas
- `/scanner/*` - Scanner de biblioteca
- `/logs/*` - Logs del sistema

---

## Características Técnicas

| Característica | Descripción |
|----------------|-------------|
| **Paginación** | Query params `skip/take` o `page/limit` |
| **Búsqueda** | Via `/search/:query` o query params `?search=` |
| **Subida de Archivos** | Multipart form-data con validación de tamaño/tipo |
| **Streaming** | Soporte para range requests, HTTP 206 Partial Content |
| **Actualizaciones en Tiempo Real** | Server-Sent Events (SSE) para listening updates y radio metadata |
| **Rate Limiting** | Throttling global + límites específicos en login |
| **Caché** | Validación basada en ETag para imágenes |
| **Proxy** | Proxy de streams de radio para evitar Mixed Content en HTTPS |

---

**Total aproximado: ~150+ endpoints**
