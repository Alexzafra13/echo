# Scanner Module

Módulo para escanear directorios y importar archivos de música a la base de datos.

## Arquitectura

Sigue el patrón de **Arquitectura Hexagonal** (Clean Architecture):

```
scanner/
├── domain/                    # Capa de Dominio (reglas de negocio)
│   ├── entities/             # Entidades del dominio
│   │   └── library-scan.entity.ts
│   ├── ports/                # Interfaces (contratos)
│   │   └── scanner-repository.port.ts
│   └── use-cases/            # Casos de uso
│       ├── start-scan/       # Iniciar escaneo
│       ├── get-scan-status/  # Obtener estado
│       └── get-scans-history/ # Historial
│
├── infrastructure/           # Capa de Infraestructura (implementaciones)
│   ├── persistence/          # Acceso a datos
│   │   ├── scanner.mapper.ts
│   │   └── scanner.repository.ts
│   └── services/             # Servicios técnicos
│       ├── file-scanner.service.ts      # Escanea directorios
│       ├── metadata-extractor.service.ts # Extrae metadatos (ID3, etc.)
│       └── scan-processor.service.ts     # Procesa en background (BullMQ)
│
└── presentation/             # Capa de Presentación (API REST)
    ├── controller/
    │   └── scanner.controller.ts
    └── dtos/                 # Data Transfer Objects
        ├── start-scan.dto.ts
        ├── scan-status.dto.ts
        └── scans-history.dto.ts
```

## Funcionalidades

### 1. Iniciar Escaneo

Escanea un directorio en busca de archivos de música y los importa a la BD.

**Endpoint:** `POST /api/scanner/start`

**Request:**
```json
{
  "path": "./uploads/music",  // Opcional, usa UPLOAD_PATH por defecto
  "recursive": true,           // Escanear subdirectorios
  "pruneDeleted": true         // Eliminar tracks que ya no existen
}
```

**Response:**
```json
{
  "id": "uuid-del-escaneo",
  "status": "pending",
  "startedAt": "2024-10-26T23:00:00.000Z",
  "message": "Escaneo iniciado. El proceso se ejecutará en segundo plano."
}
```

### 2. Obtener Estado de Escaneo

Consulta el progreso de un escaneo específico.

**Endpoint:** `GET /api/scanner/:id`

**Response:**
```json
{
  "id": "uuid-del-escaneo",
  "status": "running",  // pending | running | completed | failed
  "startedAt": "2024-10-26T23:00:00.000Z",
  "finishedAt": null,
  "tracksAdded": 42,
  "tracksUpdated": 5,
  "tracksDeleted": 0,
  "totalChanges": 47,
  "durationMs": null,
  "errorMessage": null
}
```

### 3. Historial de Escaneos

Obtiene lista paginada de todos los escaneos.

**Endpoint:** `GET /api/scanner?page=1&limit=20`

**Response:**
```json
{
  "scans": [ /* array de escaneos */ ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

## Procesamiento en Background

El escaneo se procesa en **background** usando **BullMQ** (Redis):

1. Usuario hace POST /scanner/start
2. Se crea registro en BD con status="pending"
3. Se encola job en BullMQ
4. El procesador (ScanProcessor) toma el job
5. Escanea directorios → Extrae metadatos → Guarda en BD
6. Actualiza estado a "completed" o "failed"

```
[POST] → [Create Scan Record] → [Enqueue Job] → [Return 202 Accepted]
                                         ↓
                          [Background Worker (BullMQ)]
                                         ↓
          [Scan Files] → [Extract Metadata] → [Save to DB] → [Update Scan]
```

## Formatos Soportados

El scanner soporta los siguientes formatos de audio:

- **MP3** (.mp3)
- **FLAC** (.flac)
- **AAC** (.m4a, .aac)
- **OGG** (.ogg, .opus)
- **WAV** (.wav)
- **WMA** (.wma)
- **APE** (.ape)

## Metadatos Extraídos

Usa la librería `music-metadata` para extraer:

### Básicos
- Título
- Artista
- Álbum
- Artista del álbum
- Año
- Género

### Track Info
- Número de pista
- Número de disco
- Duración

### Técnicos
- Bitrate
- Sample rate
- Canales
- Codec

### MusicBrainz IDs
- Track ID
- Album ID
- Artist ID
- Album Artist ID

### Otros
- Comentarios
- Letras
- Cover art (detecta si existe)

## Seguridad

- **Autenticación:** JWT requerido
- **Autorización:** Solo usuarios con rol `admin`
- **Guards:** `JwtAuthGuard` + `AdminGuard`

## Dependencias

- `music-metadata` - Extracción de metadatos
- `bullmq` - Cola de trabajos
- `ioredis` - Cliente Redis
- `drizzle-orm` - ORM

## Configuración

Variables de entorno necesarias:

```bash
# Ruta donde están los archivos de música
UPLOAD_PATH=./uploads/music

# Redis (para BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Testing

Una vez que el servidor esté corriendo:

### 1. Preparar archivos
```bash
# Colocar archivos .mp3 en uploads/music/
mkdir -p uploads/music
cp /ruta/a/musica/*.mp3 uploads/music/
```

### 2. Iniciar escaneo
```bash
curl -X POST http://localhost:3000/api/scanner/start \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recursive": true,
    "pruneDeleted": true
  }'
```

### 3. Ver estado
```bash
curl http://localhost:3000/api/scanner/SCAN_ID \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### 4. Ver historial
```bash
curl http://localhost:3000/api/scanner \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

## Implementación

El módulo está **completamente implementado** con:

✅ Domain Layer - Entities, Ports, Use Cases
✅ Infrastructure Layer - Repository, File Scanner, Metadata Extractor, BullMQ Processor
✅ Presentation Layer - Controller, DTOs, Swagger docs
✅ Integración con BullMQ para procesamiento async
✅ Añadido a app.module.ts

## Próximos Pasos

Para probarlo:

1. Levantar servicios: `docker-compose up -d` (PostgreSQL + Redis)
2. Generar migraciones de Drizzle: `pnpm db:generate`
3. Aplicar migraciones: `pnpm db:push`
4. Iniciar servidor: `pnpm dev`
5. Probar endpoints con curl o Postman

## Notas

- El escaneo puede tardar según la cantidad de archivos
- Se recomienda no iniciar múltiples escaneos simultáneamente
- El sistema valida que no haya escaneos en progreso antes de iniciar uno nuevo
- Los archivos duplicados (mismo path) se actualizan en lugar de duplicarse
