# Arquitectura de Imágenes V2 - Estilo Jellyfin

## Objetivos

1. ✅ **Local-first**: Priorizar imágenes del disco sobre externas
2. ✅ **Auto-enriquecimiento**: Descargar automáticamente imágenes faltantes
3. ✅ **Cache correcto**: Tag-based invalidation que funcione siempre
4. ✅ **Sin duplicaciones**: Una sola fuente de verdad por tipo de imagen
5. ✅ **Claridad**: Separación explícita local vs externo

---

## 1. Modelo de Datos (schema.prisma)

### Nuevo Modelo Artist

```prisma
model Artist {
  id                     String    @id @default(uuid())
  name                   String    @db.VarChar(255)

  // Metadata básica
  albumCount             Int       @default(0)
  songCount              Int       @default(0)
  mbzArtistId            String?
  biography              String?   @db.Text
  biographySource        String?

  // === SISTEMA DE IMÁGENES V2 ===

  // Profile/Thumb Images
  profileImagePath       String?   @map("profile_image_path")       // Local (folder.jpg, artist.jpg)
  profileImageUpdatedAt  DateTime? @map("profile_image_updated_at")
  externalProfilePath    String?   @map("external_profile_path")    // Descargado de Fanart/Last.fm
  externalProfileSource  String?   @map("external_profile_source")  // 'fanart', 'lastfm', etc.
  externalProfileUpdatedAt DateTime? @map("external_profile_updated_at")

  // Background Images
  backgroundImagePath    String?   @map("background_image_path")    // Local (fanart.jpg, background.jpg)
  backgroundUpdatedAt    DateTime? @map("background_updated_at")
  externalBackgroundPath String?   @map("external_background_path")
  externalBackgroundSource String? @map("external_background_source")
  externalBackgroundUpdatedAt DateTime? @map("external_background_updated_at")

  // Banner Images
  bannerImagePath        String?   @map("banner_image_path")        // Local (banner.jpg)
  bannerUpdatedAt        DateTime? @map("banner_updated_at")
  externalBannerPath     String?   @map("external_banner_path")
  externalBannerSource   String?   @map("external_banner_source")
  externalBannerUpdatedAt DateTime? @map("external_banner_updated_at")

  // Logo Images
  logoImagePath          String?   @map("logo_image_path")          // Local (logo.png)
  logoUpdatedAt          DateTime? @map("logo_updated_at")
  externalLogoPath       String?   @map("external_logo_path")
  externalLogoSource     String?   @map("external_logo_source")
  externalLogoUpdatedAt  DateTime? @map("external_logo_updated_at")

  // Otros campos...
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  @@map("artists")
}
```

**Convenciones**:
- `*ImagePath`: Ruta al archivo local (dentro de carpeta del artista en disco)
- `external*Path`: Ruta al archivo descargado (dentro de `storage/metadata/artists/{id}/`)
- `*UpdatedAt`: Timestamp para cache-busting y validación
- `*Source`: Origen del recurso externo (`fanart`, `lastfm`, `musicbrainz`, etc.)

---

## 2. Almacenamiento en Disco

### Estructura de Directorios

```
# Música en Disco
/mnt/music/
└── Artists/
    └── Billy Talent/
        ├── folder.jpg        # → profileImagePath
        ├── fanart.jpg        # → backgroundImagePath
        ├── banner.jpg        # → bannerImagePath
        ├── logo.png          # → logoImagePath
        └── Albums/
            └── Album Name/
                ├── cover.jpg
                └── tracks...

# Metadata Descargada (External)
storage/metadata/artists/
└── {artistId}/
    ├── profile.jpg           # → externalProfilePath
    ├── background.jpg        # → externalBackgroundPath
    ├── banner.jpg            # → externalBannerPath
    └── logo.png              # → externalLogoPath
```

---

## 3. Flujo de Escaneo Inicial

### Durante Library Scan

```typescript
// 1. Scanner detecta carpeta de artista
const artistFolder = "/mnt/music/Artists/Billy Talent";

// 2. LocalImageProvider busca imágenes
const localImages = await localImageProvider.findImages(artistFolder);
// Resultado:
// {
//   profile: "/mnt/music/Artists/Billy Talent/folder.jpg",
//   background: "/mnt/music/Artists/Billy Talent/fanart.jpg",
//   logo: "/mnt/music/Artists/Billy Talent/logo.png"
// }

// 3. Actualizar BD con rutas locales
await prisma.artist.update({
  where: { id: artistId },
  data: {
    profileImagePath: localImages.profile,
    profileImageUpdatedAt: new Date(),
    backgroundImagePath: localImages.background,
    backgroundUpdatedAt: new Date(),
    logoImagePath: localImages.logo,
    logoUpdatedAt: new Date(),
  }
});

// 4. Auto-enriquecimiento (solo imágenes faltantes)
if (!localImages.profile || !localImages.background) {
  await enrichArtistImages(artistId);
}
```

---

## 4. LocalImageProvider

### Naming Conventions (prioridad de búsqueda)

```typescript
const PROFILE_IMAGE_NAMES = [
  'folder.jpg',
  'folder.png',
  'artist.jpg',
  'artist.png',
  'thumb.jpg',
  'thumb.png',
];

const BACKGROUND_IMAGE_NAMES = [
  'fanart.jpg',
  'fanart.png',
  'background.jpg',
  'background.png',
  'backdrop.jpg',
];

const LOGO_IMAGE_NAMES = [
  'logo.png',
  'logo.jpg',
  'clearlogo.png',
];

const BANNER_IMAGE_NAMES = [
  'banner.jpg',
  'banner.png',
];
```

### Implementación

```typescript
export class LocalImageProvider {
  async findImages(artistFolder: string): Promise<LocalArtistImages> {
    const files = await fs.readdir(artistFolder);

    return {
      profile: this.findFirstMatch(files, PROFILE_IMAGE_NAMES, artistFolder),
      background: this.findFirstMatch(files, BACKGROUND_IMAGE_NAMES, artistFolder),
      logo: this.findFirstMatch(files, LOGO_IMAGE_NAMES, artistFolder),
      banner: this.findFirstMatch(files, BANNER_IMAGE_NAMES, artistFolder),
    };
  }

  private findFirstMatch(
    files: string[],
    candidates: string[],
    baseFolder: string
  ): string | null {
    for (const candidate of candidates) {
      const found = files.find(f =>
        f.toLowerCase() === candidate.toLowerCase()
      );
      if (found) {
        return path.join(baseFolder, found);
      }
    }
    return null;
  }
}
```

---

## 5. Auto-Enriquecimiento

### Trigger: Después de Library Scan

```typescript
async enrichArtistImages(artistId: string): Promise<void> {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      profileImagePath: true,
      externalProfilePath: true,
      backgroundImagePath: true,
      externalBackgroundPath: true,
      logoImagePath: true,
      externalLogoPath: true,
      bannerImagePath: true,
      externalBannerPath: true,
      mbzArtistId: true,
      name: true,
    }
  });

  // Buscar imágenes disponibles en Fanart.tv
  const availableImages = await fanartAgent.searchImages(
    artist.name,
    artist.mbzArtistId
  );

  // Descargar SOLO las que faltan
  const tasks = [];

  // Profile: solo si no hay ni local ni externa
  if (!artist.profileImagePath && !artist.externalProfilePath && availableImages.profile) {
    tasks.push(this.downloadExternalImage(artistId, 'profile', availableImages.profile));
  }

  // Background: solo si no hay ni local ni externa
  if (!artist.backgroundImagePath && !artist.externalBackgroundPath && availableImages.background) {
    tasks.push(this.downloadExternalImage(artistId, 'background', availableImages.background));
  }

  // Logo: solo si no hay ni local ni externa
  if (!artist.logoImagePath && !artist.externalLogoPath && availableImages.logo) {
    tasks.push(this.downloadExternalImage(artistId, 'logo', availableImages.logo));
  }

  // Banner: solo si no hay ni local ni externa
  if (!artist.bannerImagePath && !artist.externalBannerPath && availableImages.banner) {
    tasks.push(this.downloadExternalImage(artistId, 'banner', availableImages.banner));
  }

  await Promise.all(tasks);
}

private async downloadExternalImage(
  artistId: string,
  imageType: ImageType,
  url: string
): Promise<void> {
  // Descargar imagen
  const buffer = await downloadImage(url);

  // Guardar en storage/metadata/artists/{artistId}/{imageType}.jpg
  const filename = `${imageType}.jpg`;
  const savePath = await storage.saveArtistImage(artistId, filename, buffer);

  // Actualizar BD
  await prisma.artist.update({
    where: { id: artistId },
    data: {
      [`external${capitalize(imageType)}Path`]: filename, // Solo nombre archivo
      [`external${capitalize(imageType)}Source`]: 'fanart',
      [`external${capitalize(imageType)}UpdatedAt`]: new Date(),
    }
  });
}
```

---

## 6. Priorización en ImageService

### getArtistImage() - Local First

```typescript
async getArtistImage(
  artistId: string,
  imageType: 'profile' | 'background' | 'logo' | 'banner'
): Promise<ImageResult> {
  const artist = await prisma.artist.findUnique({ where: { id: artistId }});

  // PRIORIDAD 1: Local image (desde disco)
  const localPath = artist[`${imageType}ImagePath`];
  if (localPath) {
    try {
      // Validar que el archivo existe
      await fs.access(localPath);
      const stats = await fs.stat(localPath);

      return {
        filePath: localPath,
        mimeType: this.getMimeType(localPath),
        size: stats.size,
        lastModified: stats.mtime,
        source: 'local',
        tag: this.generateTag(localPath, stats.mtime), // ← Tag para cache
      };
    } catch (error) {
      // Archivo local ya no existe, limpiar BD
      this.logger.warn(`Local image not found: ${localPath}`);
      await this.clearLocalImage(artistId, imageType);
    }
  }

  // PRIORIDAD 2: External image (descargada)
  const externalPath = artist[`external${capitalize(imageType)}Path`];
  if (externalPath) {
    const fullPath = path.join(
      await storage.getArtistMetadataPath(artistId),
      externalPath
    );

    try {
      await fs.access(fullPath);
      const stats = await fs.stat(fullPath);

      return {
        filePath: fullPath,
        mimeType: this.getMimeType(fullPath),
        size: stats.size,
        lastModified: stats.mtime,
        source: 'external',
        tag: this.generateTag(fullPath, stats.mtime), // ← Tag para cache
      };
    } catch (error) {
      this.logger.warn(`External image not found: ${fullPath}`);
      await this.clearExternalImage(artistId, imageType);
    }
  }

  throw new NotFoundException(`No ${imageType} image for artist ${artistId}`);
}

// Generar tag único para cache-busting
private generateTag(filePath: string, mtime: Date): string {
  return createHash('md5')
    .update(`${filePath}:${mtime.getTime()}`)
    .digest('hex')
    .substring(0, 8);
}
```

---

## 7. Tag-based Cache Busting

### Backend - ImagesController

```typescript
@Get('artists/:artistId/:imageType')
async getArtistImageByType(
  @Param('artistId') artistId: string,
  @Param('imageType') imageType: string,
  @Query('tag') tag?: string, // ← Cache tag
  @Res() res: Response
): Promise<void> {
  const imageResult = await this.imageService.getArtistImage(artistId, imageType);

  // Si tag coincide, enviar 304 Not Modified
  if (tag && tag === imageResult.tag) {
    res.status(304).end();
    return;
  }

  // Enviar imagen con cache headers
  res.header('Content-Type', imageResult.mimeType);
  res.header('Content-Length', String(imageResult.size));
  res.header('Cache-Control', 'public, max-age=31536000, immutable'); // ← Cache agresivo OK porque tag cambia
  res.header('ETag', imageResult.tag);

  const stream = fs.createReadStream(imageResult.filePath);
  stream.pipe(res);
}
```

### Frontend - getArtistImageUrl()

```typescript
export function getArtistImageUrl(
  artistId: string,
  imageType: 'profile' | 'background' | 'logo' | 'banner',
  tag?: string // ← Tag en lugar de timestamp
): string {
  const baseUrl = `/api/images/artists/${artistId}/${imageType}`;

  if (tag) {
    return `${baseUrl}?tag=${tag}`;
  }

  return baseUrl;
}
```

### Actualizar useArtist Hook

```typescript
export interface Artist {
  id: string;
  name: string;
  // ... otros campos

  // Tags para cache-busting
  profileImageTag?: string;
  backgroundImageTag?: string;
  logoImageTag?: string;
  bannerImageTag?: string;
}

// Backend genera tags y los incluye en respuesta API
GET /api/artists/:id
{
  "id": "...",
  "name": "Billy Talent",
  "profileImageTag": "a3f2b1c8",     // ← Calculado desde lastModified
  "backgroundImageTag": "7d4e9a2f",
  "logoImageTag": "1b5c3e9a",
  ...
}
```

---

## 8. Cambio Manual de Imagen (UI)

### ApplyArtistAvatar Use Case - NUEVA LÓGICA

```typescript
async execute(dto: ApplyArtistAvatarDto): Promise<void> {
  const { artistId, avatarUrl, provider, type } = dto;

  const artist = await this.prisma.artist.findUnique({ where: { id: artistId }});

  // 1. Eliminar imagen externa ANTERIOR (si existe)
  const oldExternalPath = artist[`external${capitalize(type)}Path`];
  if (oldExternalPath) {
    const fullPath = path.join(
      await this.storage.getArtistMetadataPath(artistId),
      oldExternalPath
    );
    await this.storage.deleteFile(fullPath);
  }

  // 2. Descargar NUEVA imagen
  const buffer = await this.imageDownloadService.download(avatarUrl);
  const extension = this.getExtensionFromUrl(avatarUrl);
  const filename = `${type}.${extension}`;

  // 3. Guardar en storage/metadata/artists/{artistId}/
  const savePath = await this.storage.saveArtistImage(artistId, filename, buffer);

  // 4. Actualizar BD con NUEVA imagen externa
  await this.prisma.artist.update({
    where: { id: artistId },
    data: {
      [`external${capitalize(type)}Path`]: filename,
      [`external${capitalize(type)}Source`]: provider,
      [`external${capitalize(type)}UpdatedAt`]: new Date(), // ← Esto cambia el tag
    }
  });

  // 5. Invalidar cache en memoria (si existe)
  this.imageService.invalidateArtistCache(artistId);

  // 6. Emitir WebSocket
  this.metadataGateway.emitArtistImagesUpdated(artistId, type);
}
```

**Nota importante**: NO tocamos las imágenes locales (`*ImagePath`). Solo actualizamos las externas (`external*Path`).

---

## 9. Flujo Completo de Usuario

### Caso 1: Primera Instalación + Library Scan

```
1. Usuario añade carpeta de música: /mnt/music/Artists/Billy Talent/
   - folder.jpg ✅
   - fanart.jpg ✅
   - NO tiene logo.png ❌

2. Scanner ejecuta:
   - LocalImageProvider detecta folder.jpg → profileImagePath
   - LocalImageProvider detecta fanart.jpg → backgroundImagePath
   - LocalImageProvider NO encuentra logo → logoImagePath = null

3. Auto-enriquecimiento:
   - Profile: YA TIENE (local) → skip
   - Background: YA TIENE (local) → skip
   - Logo: FALTA → buscar en Fanart.tv
   - Logo encontrado → descargar → externalLogoPath = "logo.png"

4. Usuario ve artista:
   - Profile: usa /mnt/music/.../folder.jpg (local, tag=x1y2z3)
   - Background: usa /mnt/music/.../fanart.jpg (local, tag=a4b5c6)
   - Logo: usa storage/metadata/.../logo.png (external, tag=d7e8f9)
```

### Caso 2: Usuario Cambia Background Manualmente

```
1. Usuario abre modal de selección de imágenes
2. Fanart.tv ofrece 3 backgrounds diferentes
3. Usuario selecciona background #2 (diferente al actual)

4. ApplyArtistAvatar ejecuta:
   - Elimina storage/metadata/{id}/background.jpg (vieja externa)
   - Descarga nueva imagen desde Fanart.tv
   - Guarda como storage/metadata/{id}/background.jpg (NUEVA)
   - Actualiza externalBackgroundUpdatedAt = NOW
   - Invalidaciones y WebSocket

5. ImageService responde:
   - backgroundImagePath SIGUE siendo /mnt/music/.../fanart.jpg (local)
   - externalBackgroundPath ahora es la NUEVA descargada
   - PERO prioridad es LOCAL → sigue usando fanart.jpg del disco ❌

PROBLEMA: Si el usuario quiere reemplazar la LOCAL, necesitamos lógica adicional
```

### Caso 2 (CORREGIDO): Reemplazar también Local

```typescript
async execute(dto: ApplyArtistAvatarDto): Promise<void> {
  const { artistId, avatarUrl, provider, type, replaceLocal } = dto;

  // ... descarga y guarda external ...

  // Opción A: Solo actualizar external (mantener local)
  if (!replaceLocal) {
    await this.prisma.artist.update({
      where: { id: artistId },
      data: {
        [`external${capitalize(type)}Path`]: filename,
        [`external${capitalize(type)}UpdatedAt`]: new Date(),
      }
    });
  }

  // Opción B: Reemplazar local por external (clear local)
  if (replaceLocal) {
    await this.prisma.artist.update({
      where: { id: artistId },
      data: {
        [`${type}ImagePath`]: null,             // ← Borrar referencia local
        [`${type}UpdatedAt`]: null,
        [`external${capitalize(type)}Path`]: filename,
        [`external${capitalize(type)}UpdatedAt`]: new Date(),
      }
    });
  }
}
```

**Decisión de Diseño**:
- Por defecto, `replaceLocal = true` cuando usuario aplica manualmente
- Imágenes manuales REEMPLAZAN las locales (usuario tiene intención explícita)
- Auto-enriquecimiento usa `replaceLocal = false` (no toca locales)

---

## 10. Migración de Datos Existentes

```sql
-- Paso 1: Añadir nuevas columnas
ALTER TABLE artists
  ADD COLUMN profile_image_path VARCHAR(512),
  ADD COLUMN profile_image_updated_at TIMESTAMP,
  ADD COLUMN external_profile_path VARCHAR(512),
  ADD COLUMN external_profile_source VARCHAR(50),
  ADD COLUMN external_profile_updated_at TIMESTAMP,

  ADD COLUMN background_image_path VARCHAR(512),
  ADD COLUMN background_updated_at TIMESTAMP,
  ADD COLUMN external_background_path VARCHAR(512),
  ADD COLUMN external_background_source VARCHAR(50),
  ADD COLUMN external_background_updated_at TIMESTAMP,

  ADD COLUMN logo_image_path VARCHAR(512),
  ADD COLUMN logo_updated_at TIMESTAMP,
  ADD COLUMN external_logo_path VARCHAR(512),
  ADD COLUMN external_logo_source VARCHAR(50),
  ADD COLUMN external_logo_updated_at TIMESTAMP,

  ADD COLUMN banner_image_path VARCHAR(512),
  ADD COLUMN banner_updated_at TIMESTAMP,
  ADD COLUMN external_banner_path VARCHAR(512),
  ADD COLUMN external_banner_source VARCHAR(50),
  ADD COLUMN external_banner_updated_at TIMESTAMP;

-- Paso 2: Migrar datos existentes
UPDATE artists
SET
  external_profile_path = COALESCE(large_image_url, medium_image_url, small_image_url),
  external_profile_updated_at = external_info_updated_at,
  external_background_path = background_image_url,
  external_background_updated_at = external_info_updated_at,
  external_logo_path = logo_image_url,
  external_logo_updated_at = external_info_updated_at,
  external_banner_path = banner_image_url,
  external_banner_updated_at = external_info_updated_at
WHERE
  large_image_url IS NOT NULL
  OR medium_image_url IS NOT NULL
  OR small_image_url IS NOT NULL
  OR background_image_url IS NOT NULL
  OR logo_image_url IS NOT NULL
  OR banner_image_url IS NOT NULL;

-- Paso 3: Eliminar columnas antiguas
ALTER TABLE artists
  DROP COLUMN small_image_url,
  DROP COLUMN medium_image_url,
  DROP COLUMN large_image_url,
  DROP COLUMN background_image_url,
  DROP COLUMN banner_image_url,
  DROP COLUMN logo_image_url,
  DROP COLUMN external_info_updated_at;
```

---

## 11. Resumen de Cambios

### Backend
1. ✅ Nuevo schema con separación local/externo
2. ✅ LocalImageProvider para detectar imágenes del disco
3. ✅ Auto-enriquecimiento inteligente (solo faltantes)
4. ✅ ImageService con priorización Local > External
5. ✅ Tag-based cache busting
6. ✅ ApplyArtistAvatar con `replaceLocal` flag

### Frontend
1. ✅ useArtist hook incluye tags
2. ✅ getArtistImageUrl usa tags en lugar de timestamps
3. ✅ Render keys siguen funcionando para re-renders
4. ✅ WebSocket sync actualizado para nuevos campos

### Migration Path
1. ✅ Migración SQL para nuevas columnas
2. ✅ Migración de datos existentes (external)
3. ✅ Re-scan de biblioteca para detectar locales
4. ✅ Drop de columnas obsoletas

---

## 12. Ventajas de esta Arquitectura

1. **Local-first**: Imágenes del disco siempre tienen prioridad
2. **Auto-enriquecimiento**: Descarga solo lo que falta
3. **Claridad**: Separación explícita local vs externo
4. **Cache eficiente**: Tags únicos por imagen + validación
5. **Sin duplicaciones**: Una fuente de verdad por tipo
6. **Flexible**: Usuario puede reemplazar local por externo explícitamente
7. **Validación**: Detecta archivos borrados y limpia BD
8. **Performance**: Cache agresivo con invalidación correcta

---

## Próximo Paso

Implementar esta arquitectura paso a paso, empezando por:
1. Actualizar schema.prisma
2. Crear migración
3. Implementar LocalImageProvider
4. Actualizar ImageService con priorización
5. Modificar ApplyArtistAvatar
6. Actualizar frontend con tags
