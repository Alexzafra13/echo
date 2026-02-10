# Architecture

## System Overview

```mermaid
graph TB
    Client[Web Browser / PWA]

    subgraph Docker["Docker Compose"]
        subgraph Echo["Echo Container"]
            Fastify[Fastify HTTP Server]
            NestJS[NestJS Application]
            WS[Socket.IO WebSocket]
            BullWorker[BullMQ Workers]
        end
        PG[(PostgreSQL 16)]
        Redis[(Redis 7)]
    end

    Client <-->|HTTP / REST| Fastify
    Client <-->|WebSocket| WS
    NestJS -->|Drizzle ORM| PG
    NestJS -->|ioredis| Redis
    BullWorker -->|Job Queue| Redis
    BullWorker -->|Read/Write| PG
```

## Request Flow

How an API request flows through the hexagonal architecture:

```mermaid
sequenceDiagram
    participant C as Client
    participant F as Fastify
    participant G as Guards
    participant CT as Controller
    participant UC as Use Case
    participant CR as CachedRepository
    participant DR as DrizzleRepository
    participant RD as Redis
    participant DB as PostgreSQL

    C->>F: GET /api/albums/:id
    F->>G: ThrottlerGuard (300 req/min)
    G->>G: JwtAuthGuard (verify token)
    G->>CT: AlbumsController.getAlbum()
    CT->>UC: GetAlbumUseCase.execute()
    UC->>CR: albumRepository.findById(id)

    CR->>RD: GET album:{id}
    alt Cache Hit
        RD-->>CR: cached data
        CR-->>UC: Album entity
    else Cache Miss
        RD-->>CR: null
        CR->>DR: findById(id)
        DR->>DB: SELECT ... FROM albums JOIN artists
        DB-->>DR: row
        DR-->>CR: Album entity
        CR->>RD: SETEX album:{id} (TTL 1h)
    end

    UC-->>CT: AlbumResponseDto
    CT-->>C: HTTP 200 JSON
```

## Hexagonal Architecture

Each feature module follows domain-driven layers:

```mermaid
graph LR
    subgraph Presentation
        Controller[Controller]
        DTO[DTOs]
        Gateway[WebSocket Gateway]
    end

    subgraph Domain
        UseCase[Use Cases]
        Entity[Entities]
        Port[Ports / Interfaces]
    end

    subgraph Infrastructure
        Repo[Repository Impl]
        Mapper[Mappers]
        ExtService[External Services]
    end

    Controller --> UseCase
    UseCase --> Port
    Port -.->|implements| Repo
    Repo --> Mapper
    Gateway --> UseCase
    Controller --> DTO
```

**Example with Albums:**

| Layer | Class | File |
|-------|-------|------|
| Controller | `AlbumsController` | `albums/presentation/controller/` |
| Use Case | `GetAlbumUseCase` | `albums/domain/use-cases/get-album/` |
| Port | `IAlbumRepository` | `albums/domain/ports/` |
| Repository | `DrizzleAlbumRepository` | `albums/infrastructure/persistence/` |
| Cache Decorator | `CachedAlbumRepository` | `albums/infrastructure/persistence/` |
| Mapper | `AlbumMapper` | `albums/infrastructure/persistence/` |

## Caching Strategy

Cache-aside pattern with Redis:

```mermaid
graph TD
    UC[Use Case] --> CR[CachedAlbumRepository]

    CR --> Check{Redis Cache?}
    Check -->|Hit| Return[Return Entity]
    Check -->|Miss| DR[DrizzleAlbumRepository]
    DR --> DB[(PostgreSQL)]
    DB --> Store[Store in Redis with TTL]
    Store --> Return

    Write[Write Operation] --> DR2[DrizzleRepository.update]
    DR2 --> Invalidate[Invalidate Cache Keys]
    Invalidate --> RD2[(Redis DEL pattern)]
```

**TTLs:**

| Data | TTL | Reason |
|------|-----|--------|
| Single entity (album, artist) | 1 hour | Rarely changes |
| Search results | 1 min | Must stay fresh |
| Counts | 30 min | Approximate is fine |
| Recent / top played | 5 min | Changes with user activity |

## Background Jobs

Library scanning and analysis run asynchronously via BullMQ:

```mermaid
sequenceDiagram
    participant Admin
    participant API as Scanner Controller
    participant Q as BullMQ Queue
    participant W as Worker
    participant FS as File System
    participant DB as PostgreSQL
    participant WS as WebSocket

    Admin->>API: POST /scanner/start
    API->>Q: Add job to queue
    API-->>Admin: 202 Accepted (scanId)

    Q->>W: Pick up job
    W->>FS: Scan directories
    loop Each audio file
        W->>W: Extract metadata (music-metadata)
        W->>DB: Upsert track/album/artist
        W->>WS: Emit scan:progress
        WS-->>Admin: Real-time progress
    end
    W->>Q: Queue LUFS analysis
    W->>Q: Queue DJ analysis
    W->>WS: Emit scan:completed
```

**Job queues:**

| Queue | Job | Concurrency |
|-------|-----|-------------|
| `library-scan` | Full library scan | 1 |
| `scanner` | Incremental scan (file watcher) | 1 |
| `lufs-analysis` | Loudness normalization | 1 |
| `dj-analysis` | Smart playlist scoring | 1 |

## WebSocket Events

Real-time communication via Socket.IO:

```mermaid
graph LR
    subgraph Server
        SG[ScannerGateway<br>/scanner namespace]
        SSE1[SSE /social/listening/stream]
        SSE2[SSE /radio/metadata/stream]
    end

    subgraph Client
        SC[Scanner UI]
        SP[Social Feed]
        RP[Radio Player]
    end

    SG -->|scan:progress| SC
    SG -->|scan:completed| SC
    SG -->|lufs:progress| SC
    SG -->|library:change| SC
    SSE1 -->|listening updates| SP
    SSE2 -->|ICY metadata| RP
```

## Module Dependency Graph

```mermaid
graph TD
    App[AppModule]

    subgraph Global Infrastructure
        Drizzle[DrizzleModule]
        Cache[CacheModule / Redis]
        Queue[QueueModule / BullMQ]
        WS[WebSocketModule]
    end

    subgraph Features
        Auth[AuthModule]
        Albums[AlbumsModule]
        Artists[ArtistsModule]
        Tracks[TracksModule]
        Scanner[ScannerModule]
        Streaming[StreamingModule]
        Playlists[PlaylistsModule]
        Social[SocialModule]
        Recs[RecommendationsModule]
        ExtMeta[ExternalMetadataModule]
    end

    App --> Global Infrastructure
    App --> Features

    Auth --> Drizzle
    Albums --> Drizzle
    Albums --> Cache
    Scanner --> Queue
    Scanner --> WS
    Scanner --> Albums
    Streaming --> Tracks
    Recs --> Tracks
    Recs --> Albums
    ExtMeta --> Albums
    ExtMeta --> Artists
    Social --> Auth
```

## Deployment

```mermaid
graph TB
    Internet((Internet))

    subgraph Reverse Proxy
        RP[Caddy / Nginx / Traefik]
    end

    subgraph Docker Compose
        Echo[Echo :4567]
        PG[PostgreSQL :5432]
        Redis[Redis :6379]
    end

    subgraph Volumes
        Data[./data<br>covers, metadata, secrets]
        PGData[postgres_data]
        Music[/music :ro<br>your library]
    end

    Internet -->|HTTPS 443| RP
    RP -->|HTTP 4567| Echo
    Echo --- PG
    Echo --- Redis
    Echo --- Data
    PG --- PGData
    Echo --- Music
```
