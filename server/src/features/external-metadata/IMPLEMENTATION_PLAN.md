# Plan de Implementación: Sistema de Descarga Local de Metadata

## 🎯 Objetivo
Cambiar de almacenar URLs externas a descargar y guardar imágenes localmente, con opción de incrustar covers en archivos de audio.

---

## 📊 FASE 1: BASE DE DATOS (Schema + Migraciones)

### 1.1. Ajustes al Schema de Prisma

#### Modelo `Artist`:
```prisma
model Artist {
  id                     String    @id @default(uuid())
  name                   String    @db.VarChar(255)

  // ✅ MusicBrainz ID (ya existe, nombre correcto)
  mbzArtistId            String?   @map("mbz_artist_id") @db.VarChar(36)

  // ✅ Biografía (ya existe)
  biography              String?   @db.Text

  // 🆕 NUEVO: Source de la biografía
  biographySource        String?   @map("biography_source") @db.VarChar(50)

  // ✅ URLs de imágenes (ya existen, cambiarán de URLs externas a rutas locales)
  imageUrl               String?   @map("image_url") @db.VarChar(512)
  smallImageUrl          String?   @map("small_image_url") @db.VarChar(512)
  mediumImageUrl         String?   @map("medium_image_url") @db.VarChar(512)
  largeImageUrl          String?   @map("large_image_url") @db.VarChar(512)

  // ✅ Fanart assets (ya añadidos)
  backgroundImageUrl     String?   @map("background_image_url") @db.VarChar(512)
  bannerImageUrl         String?   @map("banner_image_url") @db.VarChar(512)
  logoImageUrl           String?   @map("logo_image_url") @db.VarChar(512)

  // ✅ Metadata (ya existe)
  externalUrl            String?   @map("external_url") @db.VarChar(512)
  externalInfoUpdatedAt  DateTime? @map("external_info_updated_at")

  // 🆕 NUEVO: Tracking de storage
  metadataStorageSize    BigInt?   @default(0) @map("metadata_storage_size") // Bytes totales

  // ... resto de campos
}
```

#### Modelo `Album`:
```prisma
model Album {
  id                      String    @id @default(uuid())
  name                    String    @db.VarChar(255)

  // ✅ MusicBrainz ID (ya existe)
  mbzAlbumId              String?   @map("mbz_album_id") @db.VarChar(36)

  // ✅ Cover art (ya existen)
  coverArtPath            String?   @map("cover_art_path") @db.VarChar(512)  // cover.jpg en carpeta
  coverArtId              String?   @map("cover_art_id") @db.VarChar(255)

  // ✅ URLs de covers (ya existen, cambiarán a rutas locales)
  smallImageUrl           String?   @map("small_image_url") @db.VarChar(512)
  mediumImageUrl          String?   @map("medium_image_url") @db.VarChar(512)
  largeImageUrl           String?   @map("large_image_url") @db.VarChar(512)

  // 🆕 NUEVO: Cover descargado de API externa
  externalCoverPath       String?   @map("external_cover_path") @db.VarChar(512)
  externalCoverSource     String?   @map("external_cover_source") @db.VarChar(50)

  // ✅ Metadata (ya existe)
  externalUrl             String?   @map("external_url") @db.VarChar(512)
  externalInfoUpdatedAt   DateTime? @map("external_info_updated_at")

  // ... resto de campos
}
```

#### Modelo `Setting` (🆕 NUEVO):
```prisma
model Setting {
  key         String   @id @db.VarChar(100)
  value       String   @db.Text
  category    String   @db.VarChar(50)
  type        String   @default("string") @db.VarChar(20) // string, boolean, number, json
  description String?  @db.Text
  isPublic    Boolean  @default(false) @map("is_public")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([category])
  @@map("settings")
}
```

### 1.2. Migraciones SQL

**Migración 1: Añadir campos a Artist y Album**
```sql
-- Add new fields to artists
ALTER TABLE "artists" ADD COLUMN "biography_source" VARCHAR(50);
ALTER TABLE "artists" ADD COLUMN "metadata_storage_size" BIGINT DEFAULT 0;

-- Add new fields to albums
ALTER TABLE "albums" ADD COLUMN "external_cover_path" VARCHAR(512);
ALTER TABLE "albums" ADD COLUMN "external_cover_source" VARCHAR(50);
```

**Migración 2: Crear tabla Settings**
```sql
CREATE TABLE "settings" (
  "key" VARCHAR(100) PRIMARY KEY,
  "value" TEXT NOT NULL,
  "category" VARCHAR(50) NOT NULL,
  "type" VARCHAR(20) NOT NULL DEFAULT 'string',
  "description" TEXT,
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL
);

CREATE INDEX "settings_category_idx" ON "settings"("category");
```

**Migración 3: Seed de settings por defecto**
```sql
INSERT INTO "settings" ("key", "value", "category", "type", "description", "is_public") VALUES
-- External Metadata Providers
('metadata.coverart.enabled', 'true', 'external_metadata', 'boolean', 'Enable Cover Art Archive', false),
('metadata.lastfm.enabled', 'false', 'external_metadata', 'boolean', 'Enable Last.fm', false),
('metadata.lastfm.api_key', '', 'external_metadata', 'string', 'Last.fm API Key', false),
('metadata.fanart.enabled', 'false', 'external_metadata', 'boolean', 'Enable Fanart.tv', false),
('metadata.fanart.api_key', '', 'external_metadata', 'string', 'Fanart.tv API Key', false),

-- Download Settings
('metadata.download.enabled', 'true', 'external_metadata', 'boolean', 'Download images locally', false),
('metadata.download.album_covers', 'true', 'external_metadata', 'boolean', 'Download album covers', false),
('metadata.download.artist_images', 'true', 'external_metadata', 'boolean', 'Download artist images', false),

-- Storage Settings
('metadata.storage.location', 'centralized', 'external_metadata', 'string', 'Storage location: centralized or portable', false),
('metadata.storage.path', '/storage/metadata', 'external_metadata', 'string', 'Base path for metadata storage', false),
('metadata.storage.max_size_mb', '500', 'external_metadata', 'number', 'Max storage per artist (MB)', false),

-- Embed Settings
('metadata.embed.enabled', 'false', 'external_metadata', 'boolean', 'Allow embedding covers in audio', false),
('metadata.embed.auto', 'false', 'external_metadata', 'boolean', 'Auto-embed without confirmation', false),
('metadata.embed.backup', 'true', 'external_metadata', 'boolean', 'Backup files before embedding', false),

-- Conflict Resolution
('metadata.conflict.strategy', 'ask', 'external_metadata', 'string', 'Strategy: keep, replace, ask', false);
```

---

## 🗂️ FASE 2: SISTEMA DE ARCHIVOS Y STORAGE

### 2.1. Estructura de directorios

**Opción A: Centralizado** (por defecto)
```
/server/storage/
  metadata/
    artists/
      {artist-id}/
        profile-small.jpg      (200x200)
        profile-medium.jpg     (400x400)
        profile-large.jpg      (800x800)
        background.jpg         (1920x1080)
        banner.png             (1000x185)
        logo.png               (transparent)
    albums/
      {album-id}/
        cover-small.jpg        (200x200)
        cover-medium.jpg       (500x500)
        cover-large.jpg        (1200x1200)
```

**Opción B: Portable** (en biblioteca de música)
```
/music/
  .echo-metadata/
    artists/
      {artist-id}/
        ...
    albums/
      {album-id}/
        ...
```

**Para covers de álbumes: Directamente en carpeta**
```
/music/
  Artist/
    Album/
      01 - Song.flac
      cover.jpg              ← Descargado aquí
      folder.jpg             ← Alternativamente
```

### 2.2. StorageService (🆕 NUEVO)

```typescript
// infrastructure/services/storage.service.ts

interface StorageConfig {
  basePath: string;
  location: 'centralized' | 'portable';
  maxSizePerArtistMB: number;
}

@Injectable()
export class StorageService {
  async getArtistMetadataPath(artistId: string): Promise<string>
  async getAlbumMetadataPath(albumId: string): Promise<string>
  async getAlbumFolderPath(albumId: string): Promise<string>
  async saveImage(path: string, buffer: Buffer): Promise<void>
  async deleteImage(path: string): Promise<void>
  async getStorageSize(path: string): Promise<number>
  async cleanupOrphanedFiles(): Promise<number>
  async ensureDirectoryExists(path: string): Promise<void>
}
```

---

## 📥 FASE 3: SERVICIOS DE DESCARGA Y PROCESAMIENTO

### 3.1. ImageDownloadService (🆕 NUEVO)

```typescript
// infrastructure/services/image-download.service.ts

@Injectable()
export class ImageDownloadService {
  /**
   * Descargar imagen desde URL externa
   */
  async downloadImage(url: string): Promise<Buffer>

  /**
   * Descargar y guardar imagen
   */
  async downloadAndSave(url: string, destinationPath: string): Promise<void>

  /**
   * Descargar múltiples tamaños
   */
  async downloadMultipleSizes(
    urls: { small: string, medium: string, large: string },
    basePath: string
  ): Promise<{ small: string, medium: string, large: string }>

  /**
   * Validar que la imagen sea válida
   */
  async validateImage(buffer: Buffer): Promise<boolean>
}
```

### 3.2. ImageProcessingService (🆕 NUEVO)

```typescript
// infrastructure/services/image-processing.service.ts

@Injectable()
export class ImageProcessingService {
  /**
   * Redimensionar imagen
   */
  async resize(buffer: Buffer, width: number, height: number): Promise<Buffer>

  /**
   * Optimizar imagen (comprimir sin perder calidad)
   */
  async optimize(buffer: Buffer): Promise<Buffer>

  /**
   * Generar thumbnails en múltiples tamaños
   */
  async generateThumbnails(
    buffer: Buffer,
    sizes: number[]
  ): Promise<Map<number, Buffer>>

  /**
   * Detectar formato de imagen
   */
  async detectFormat(buffer: Buffer): Promise<string>
}
```

### 3.3. AudioEmbedService (🆕 NUEVO - opcional)

```typescript
// infrastructure/services/audio-embed.service.ts

@Injectable()
export class AudioEmbedService {
  /**
   * Leer cover embebido de audio
   */
  async extractCover(audioPath: string): Promise<Buffer | null>

  /**
   * Incrustar cover en archivo de audio
   */
  async embedCover(audioPath: string, coverBuffer: Buffer): Promise<void>

  /**
   * Verificar si audio tiene cover
   */
  async hasCover(audioPath: string): Promise<boolean>

  /**
   * Backup de archivo antes de modificar
   */
  async backupFile(audioPath: string): Promise<string>

  /**
   * Restaurar desde backup
   */
  async restoreBackup(backupPath: string, originalPath: string): Promise<void>
}
```

---

## 🔄 FASE 4: ACTUALIZAR AGENTES Y METADATA SERVICE

### 4.1. Modificar entidades de dominio

**Antes:**
```typescript
// domain/entities/artist-images.entity.ts
export class ArtistImages {
  constructor(
    public readonly smallUrl: string | null,
    public readonly mediumUrl: string | null,
    public readonly largeUrl: string | null,
    // ...
  ) {}
}
```

**Después:**
```typescript
export class ArtistImages {
  constructor(
    public readonly smallUrl: string | null,      // Ahora puede ser URL o path local
    public readonly mediumUrl: string | null,
    public readonly largeUrl: string | null,
    public readonly backgroundUrl: string | null,
    public readonly bannerUrl: string | null,
    public readonly logoUrl: string | null,
    public readonly source: string
  ) {}

  // 🆕 NUEVO: Helpers para saber si son URLs o paths
  isExternalUrl(url: string): boolean {
    return url?.startsWith('http://') || url?.startsWith('https://');
  }

  getUrlsToDownload(): string[] {
    return [this.smallUrl, this.mediumUrl, this.largeUrl,
            this.backgroundUrl, this.bannerUrl, this.logoUrl]
      .filter(url => url && this.isExternalUrl(url));
  }
}
```

### 4.2. Actualizar ExternalMetadataService

```typescript
// application/external-metadata.service.ts

@Injectable()
export class ExternalMetadataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly cache: MetadataCacheService,
    private readonly storage: StorageService,              // 🆕 NUEVO
    private readonly imageDownload: ImageDownloadService,  // 🆕 NUEVO
    private readonly imageProcessing: ImageProcessingService, // 🆕 NUEVO (opcional)
  ) {}

  async enrichArtist(artistId: string, forceRefresh = false) {
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId }
    });

    // 1. Obtener imágenes de agentes (devuelven URLs)
    const images = await this.getArtistImages(artist.mbzArtistId, artist.name);

    if (images) {
      // 2. 🆕 NUEVO: Descargar imágenes
      const localPaths = await this.downloadArtistImages(artistId, images);

      // 3. 🆕 NUEVO: Actualizar BD con paths locales (no URLs)
      await this.prisma.artist.update({
        where: { id: artistId },
        data: {
          imageUrl: localPaths.profile,
          backgroundImageUrl: localPaths.background,
          bannerImageUrl: localPaths.banner,
          logoImageUrl: localPaths.logo,
          externalInfoUpdatedAt: new Date(),
          metadataStorageSize: localPaths.totalSize
        }
      });
    }
  }

  // 🆕 NUEVO
  private async downloadArtistImages(
    artistId: string,
    images: ArtistImages
  ): Promise<{
    profile: string,
    background: string,
    banner: string,
    logo: string,
    totalSize: number
  }> {
    const basePath = await this.storage.getArtistMetadataPath(artistId);
    let totalSize = 0;

    const localPaths = {
      profile: null,
      background: null,
      banner: null,
      logo: null,
      totalSize: 0
    };

    // Descargar profile (mejor calidad disponible)
    if (images.largeUrl) {
      const path = `${basePath}/profile-large.jpg`;
      await this.imageDownload.downloadAndSave(images.largeUrl, path);
      localPaths.profile = path;
      totalSize += await this.storage.getStorageSize(path);
    }

    // Descargar background
    if (images.backgroundUrl) {
      const path = `${basePath}/background.jpg`;
      await this.imageDownload.downloadAndSave(images.backgroundUrl, path);
      localPaths.background = path;
      totalSize += await this.storage.getStorageSize(path);
    }

    // ... similar para banner y logo

    localPaths.totalSize = totalSize;
    return localPaths;
  }

  async enrichAlbum(albumId: string, forceRefresh = false) {
    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
      include: { artist: true }
    });

    // 1. Obtener cover de agentes
    const cover = await this.getAlbumCover(album.mbzAlbumId, album.artist.name, album.name);

    if (cover) {
      // 2. 🆕 NUEVO: Descargar cover
      const localPath = await this.downloadAlbumCover(albumId, album.path, cover);

      // 3. 🆕 NUEVO: Actualizar BD
      await this.prisma.album.update({
        where: { id: albumId },
        data: {
          externalCoverPath: localPath,
          externalCoverSource: cover.source,
          externalInfoUpdatedAt: new Date()
        }
      });

      // 4. 🆕 OPCIONAL: Incrustar en archivos de audio
      const settings = await this.settingsService.get('metadata.embed');
      if (settings.enabled) {
        await this.embedCoverInTracks(albumId, localPath);
      }
    }
  }

  // 🆕 NUEVO
  private async downloadAlbumCover(
    albumId: string,
    albumPath: string,
    cover: AlbumCover
  ): Promise<string> {
    const settings = await this.settingsService.getCategory('external_metadata');

    // Opción 1: Guardar en carpeta del álbum
    if (settings['metadata.download.save_in_folder'] === 'true') {
      const coverPath = path.join(albumPath, 'cover.jpg');
      await this.imageDownload.downloadAndSave(cover.largeUrl, coverPath);
      return coverPath;
    }

    // Opción 2: Guardar en metadata centralizada
    const metadataPath = await this.storage.getAlbumMetadataPath(albumId);
    const coverPath = path.join(metadataPath, 'cover.jpg');
    await this.imageDownload.downloadAndSave(cover.largeUrl, coverPath);
    return coverPath;
  }

  // 🆕 NUEVO
  private async embedCoverInTracks(
    albumId: string,
    coverPath: string
  ): Promise<void> {
    const tracks = await this.prisma.track.findMany({
      where: { albumId }
    });

    const coverBuffer = await fs.readFile(coverPath);

    for (const track of tracks) {
      const hasCover = await this.audioEmbed.hasCover(track.path);

      if (!hasCover) {
        await this.audioEmbed.embedCover(track.path, coverBuffer);
        this.logger.log(`Embedded cover in: ${track.title}`);
      }
    }
  }
}
```

### 4.3. NO modificar agentes

Los agentes (CoverArtArchiveAgent, LastfmAgent, FanartTvAgent) siguen devolviendo URLs. La descarga la hace el `ExternalMetadataService`.

**Razón:** Separación de responsabilidades
- Agentes: Obtener URLs de APIs externas
- MetadataService: Descargar y almacenar localmente

---

## ⚙️ FASE 5: SISTEMA DE CONFIGURACIÓN (Settings)

### 5.1. SettingsService (🆕 NUEVO)

```typescript
// infrastructure/services/settings.service.ts

@Injectable()
export class SettingsService {
  /**
   * Obtener un setting
   */
  async get(key: string): Promise<any>

  /**
   * Obtener múltiples settings por categoría
   */
  async getCategory(category: string): Promise<Record<string, any>>

  /**
   * Actualizar un setting
   */
  async set(key: string, value: any): Promise<void>

  /**
   * Actualizar múltiples settings
   */
  async setMultiple(settings: Record<string, any>): Promise<void>

  /**
   * Resetear a valores por defecto
   */
  async resetToDefaults(): Promise<void>

  /**
   * Validar API key
   */
  async validateApiKey(service: 'lastfm' | 'fanart', apiKey: string): Promise<boolean>
}
```

### 5.2. SettingsRepository (🆕 NUEVO)

```typescript
// infrastructure/persistence/settings.repository.ts

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(key: string): Promise<Setting | null>
  async findByCategory(category: string): Promise<Setting[]>
  async create(data: CreateSettingDto): Promise<Setting>
  async update(key: string, value: string): Promise<Setting>
  async delete(key: string): Promise<void>
}
```

---

## 🖼️ FASE 6: SERVIR IMÁGENES (Endpoints y Caché)

### 6.1. ImageController (🆕 NUEVO)

```typescript
// presentation/images.controller.ts

@Controller('images')
export class ImagesController {
  /**
   * Servir imagen de artista
   * GET /api/images/artists/:id/:type
   * type: profile, background, banner, logo
   */
  @Get('artists/:id/:type')
  async getArtistImage(
    @Param('id') artistId: string,
    @Param('type') type: string,
    @Query('size') size?: string,  // small, medium, large
    @Res() res: Response
  ) {
    const imagePath = await this.imageService.getArtistImage(artistId, type, size);

    if (!imagePath || !fs.existsSync(imagePath)) {
      throw new NotFoundException('Image not found');
    }

    // Cache headers
    res.set({
      'Cache-Control': 'public, max-age=31536000',  // 1 year
      'Content-Type': mime.lookup(imagePath)
    });

    return res.sendFile(imagePath);
  }

  /**
   * Servir cover de álbum
   * GET /api/images/albums/:id/cover
   */
  @Get('albums/:id/cover')
  async getAlbumCover(
    @Param('id') albumId: string,
    @Query('size') size?: string,
    @Res() res: Response
  ) {
    // Similar al de arriba
  }
}
```

### 6.2. ImageService (🆕 NUEVO)

```typescript
// application/image.service.ts

@Injectable()
export class ImageService {
  async getArtistImage(
    artistId: string,
    type: string,
    size?: string
  ): Promise<string | null> {
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId }
    });

    if (!artist) return null;

    switch (type) {
      case 'profile':
        return this.getImageBySizedfault(
          artist.smallImageUrl,
          artist.mediumImageUrl,
          artist.largeImageUrl,
          size
        );
      case 'background':
        return artist.backgroundImageUrl;
      case 'banner':
        return artist.bannerImageUrl;
      case 'logo':
        return artist.logoImageUrl;
      default:
        return null;
    }
  }

  private getImageBySize(
    small: string,
    medium: string,
    large: string,
    requestedSize?: string
  ): string {
    switch (requestedSize) {
      case 'small': return small || medium || large;
      case 'medium': return medium || large || small;
      case 'large':
      default: return large || medium || small;
    }
  }
}
```

---

## 🎵 FASE 7: INCRUSTAR EN AUDIO (Opcional)

### 7.1. Dependencias necesarias

```json
// package.json
{
  "dependencies": {
    "music-metadata": "^11.9.0",  // ✅ Ya instalado
    "node-id3": "^0.2.6",         // 🆕 Para escribir ID3 tags (MP3)
    "flac-metadata": "^1.0.3"     // 🆕 Para FLAC tags
  }
}
```

### 7.2. AudioEmbedService - Implementación

```typescript
// infrastructure/services/audio-embed.service.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import NodeID3 from 'node-id3';
import { parseFile } from 'music-metadata';

@Injectable()
export class AudioEmbedService {
  async embedCover(audioPath: string, coverBuffer: Buffer): Promise<void> {
    const ext = path.extname(audioPath).toLowerCase();

    switch (ext) {
      case '.mp3':
        return this.embedCoverMP3(audioPath, coverBuffer);
      case '.flac':
        return this.embedCoverFLAC(audioPath, coverBuffer);
      case '.m4a':
      case '.mp4':
        return this.embedCoverM4A(audioPath, coverBuffer);
      default:
        throw new Error(`Unsupported format: ${ext}`);
    }
  }

  private async embedCoverMP3(audioPath: string, coverBuffer: Buffer): Promise<void> {
    const tags = {
      image: {
        mime: 'image/jpeg',
        type: { id: 3, name: 'front cover' },
        description: 'Cover',
        imageBuffer: coverBuffer
      }
    };

    return NodeID3.update(tags, audioPath);
  }

  private async embedCoverFLAC(audioPath: string, coverBuffer: Buffer): Promise<void> {
    // Implementar usando flac-metadata o ffmpeg
    // ...
  }

  async backupFile(audioPath: string): Promise<string> {
    const backupPath = `${audioPath}.backup`;
    await fs.copyFile(audioPath, backupPath);
    return backupPath;
  }

  async hasCover(audioPath: string): Promise<boolean> {
    try {
      const metadata = await parseFile(audioPath);
      return metadata.common.picture && metadata.common.picture.length > 0;
    } catch {
      return false;
    }
  }
}
```

### 7.3. Confirmación UI (Backend endpoint)

```typescript
// presentation/metadata-embed.controller.ts

@Controller('metadata/embed')
@UseGuards(JwtAuthGuard)
export class MetadataEmbedController {
  /**
   * Obtener tracks sin cover en un álbum
   */
  @Get('albums/:id/missing-covers')
  async getTracksWithoutCovers(@Param('id') albumId: string) {
    const tracks = await this.prisma.track.findMany({
      where: { albumId }
    });

    const tracksWithoutCover = [];

    for (const track of tracks) {
      const hasCover = await this.audioEmbed.hasCover(track.path);
      if (!hasCover) {
        tracksWithoutCover.push({
          id: track.id,
          title: track.title,
          path: track.path
        });
      }
    }

    return {
      albumId,
      total: tracks.length,
      missing: tracksWithoutCover.length,
      tracks: tracksWithoutCover
    };
  }

  /**
   * Incrustar cover en tracks específicos
   */
  @Post('albums/:id/embed')
  async embedCoverInAlbum(
    @Param('id') albumId: string,
    @Body() body: { trackIds: string[], backup: boolean }
  ) {
    const album = await this.prisma.album.findUnique({
      where: { id: albumId }
    });

    const coverPath = album.externalCoverPath || album.coverArtPath;
    if (!coverPath) {
      throw new NotFoundException('No cover found for album');
    }

    const coverBuffer = await fs.readFile(coverPath);
    const results = [];

    for (const trackId of body.trackIds) {
      const track = await this.prisma.track.findUnique({
        where: { id: trackId }
      });

      try {
        if (body.backup) {
          await this.audioEmbed.backupFile(track.path);
        }

        await this.audioEmbed.embedCover(track.path, coverBuffer);
        results.push({ trackId, success: true });
      } catch (error) {
        results.push({ trackId, success: false, error: error.message });
      }
    }

    return { results };
  }
}
```

---

## 👨‍💼 FASE 8: ADMIN PANEL ENDPOINTS

### 8.1. AdminSettingsController (🆕 NUEVO)

```typescript
// presentation/admin-settings.controller.ts

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminSettingsController {
  /**
   * Obtener todas las settings de metadata externa
   */
  @Get('external-metadata')
  async getExternalMetadataSettings() {
    return this.settingsService.getCategory('external_metadata');
  }

  /**
   * Actualizar settings
   */
  @Put('external-metadata')
  async updateExternalMetadataSettings(@Body() settings: UpdateSettingsDto) {
    return this.settingsService.setMultiple(settings);
  }

  /**
   * Validar API key
   */
  @Post('external-metadata/validate-key')
  async validateApiKey(@Body() body: { service: string, apiKey: string }) {
    const isValid = await this.settingsService.validateApiKey(
      body.service as any,
      body.apiKey
    );

    return { valid: isValid };
  }

  /**
   * Obtener estadísticas de storage
   */
  @Get('external-metadata/storage-stats')
  async getStorageStats() {
    const artists = await this.prisma.artist.findMany({
      select: {
        id: true,
        name: true,
        metadataStorageSize: true
      }
    });

    const totalSize = artists.reduce((sum, a) => sum + (a.metadataStorageSize || 0), 0);

    return {
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      artistCount: artists.length,
      topArtists: artists
        .sort((a, b) => (b.metadataStorageSize || 0) - (a.metadataStorageSize || 0))
        .slice(0, 10)
    };
  }
}
```

---

## 🔍 FASE 9: INTEGRACIÓN CON SCANNER

### 9.1. Modificar Scanner para auto-enriquecimiento

```typescript
// features/scanner/scanner.service.ts

@Injectable()
export class ScannerService {
  constructor(
    // ... existentes
    private readonly externalMetadata: ExternalMetadataService,  // 🆕 NUEVO
    private readonly settings: SettingsService                   // 🆕 NUEVO
  ) {}

  async scanLibrary() {
    // ... escaneo existente de archivos

    // 🆕 NUEVO: Auto-enriquecimiento opcional
    const autoEnrich = await this.settings.get('metadata.auto_enrich.enabled');

    if (autoEnrich === 'true') {
      await this.enrichNewItems();
    }
  }

  private async enrichNewItems() {
    // Artistas sin biografía
    const artistsToEnrich = await this.prisma.artist.findMany({
      where: {
        biography: null,
        externalInfoUpdatedAt: null
      },
      take: 10  // Por lote
    });

    for (const artist of artistsToEnrich) {
      try {
        await this.externalMetadata.enrichArtist(artist.id);
        this.logger.log(`Auto-enriched artist: ${artist.name}`);
      } catch (error) {
        this.logger.error(`Failed to enrich ${artist.name}: ${error.message}`);
      }
    }

    // Álbumes sin cover
    const albumsToEnrich = await this.prisma.album.findMany({
      where: {
        coverArtPath: null,
        externalCoverPath: null,
        externalInfoUpdatedAt: null
      },
      take: 10
    });

    for (const album of albumsToEnrich) {
      try {
        await this.externalMetadata.enrichAlbum(album.id);
        this.logger.log(`Auto-enriched album: ${album.name}`);
      } catch (error) {
        this.logger.error(`Failed to enrich ${album.name}: ${error.message}`);
      }
    }
  }
}
```

---

## 🧹 FASE 10: LIMPIEZA Y MANTENIMIENTO

### 10.1. CleanupService (🆕 NUEVO)

```typescript
// infrastructure/services/cleanup.service.ts

@Injectable()
export class CleanupService {
  /**
   * Limpiar imágenes huérfanas (sin artista/álbum en BD)
   */
  async cleanupOrphanedImages(): Promise<number> {
    const metadataPath = await this.storage.getBasePath();
    let deletedCount = 0;

    // Limpiar carpetas de artistas
    const artistDirs = await fs.readdir(path.join(metadataPath, 'artists'));

    for (const dirName of artistDirs) {
      const artist = await this.prisma.artist.findUnique({
        where: { id: dirName }
      });

      if (!artist) {
        await fs.rm(path.join(metadataPath, 'artists', dirName), { recursive: true });
        deletedCount++;
      }
    }

    // Similar para álbumes

    return deletedCount;
  }

  /**
   * Recalcular tamaños de storage
   */
  async recalculateStorageSizes(): Promise<void> {
    const artists = await this.prisma.artist.findMany();

    for (const artist of artists) {
      const artistPath = await this.storage.getArtistMetadataPath(artist.id);
      const size = await this.storage.getStorageSize(artistPath);

      await this.prisma.artist.update({
        where: { id: artist.id },
        data: { metadataStorageSize: size }
      });
    }
  }

  /**
   * Eliminar imágenes de artista si excede límite
   */
  async enforceStorageLimits(): Promise<void> {
    const maxSizeMB = parseInt(await this.settings.get('metadata.storage.max_size_mb'));
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    const artists = await this.prisma.artist.findMany({
      where: {
        metadataStorageSize: {
          gt: maxSizeBytes
        }
      }
    });

    for (const artist of artists) {
      // Eliminar imágenes menos importantes primero (banner, logo)
      // Mantener background y profile
      this.logger.warn(`Artist ${artist.name} exceeds storage limit`);
    }
  }
}
```

### 10.2. Cron Jobs

```typescript
// infrastructure/jobs/metadata-cleanup.job.ts

@Injectable()
export class MetadataCleanupJob {
  @Cron('0 3 * * *')  // Cada día a las 3 AM
  async handleMetadataCleanup() {
    this.logger.log('Starting metadata cleanup job...');

    const deleted = await this.cleanup.cleanupOrphanedImages();
    this.logger.log(`Deleted ${deleted} orphaned image folders`);

    await this.cleanup.recalculateStorageSizes();
    this.logger.log('Recalculated storage sizes');

    await this.cleanup.enforceStorageLimits();
    this.logger.log('Enforced storage limits');
  }
}
```

---

## 📝 FASE 11: ACTUALIZAR CÓDIGO EXISTENTE

### 11.1. Cambios en ExternalMetadataService

**Archivo:** `application/external-metadata.service.ts`

**Cambios:**
1. Línea 63: Cambiar `artist.mbid` → `artist.mbzArtistId`
2. Línea 86: Cambiar `artist.mbid` → `artist.mbzArtistId`
3. Línea 157: Cambiar `album.mbid` → `album.mbzAlbumId`
4. Línea 69: Eliminar `biography_source`, usar `biographySource`
5. Línea 92: Eliminar `image_url`, usar lógica de descarga
6. Línea 168: Eliminar `cover_image`, usar `externalCoverPath`

### 11.2. Agregar nuevos imports

```typescript
import { StorageService } from '../infrastructure/services/storage.service';
import { ImageDownloadService } from '../infrastructure/services/image-download.service';
import { SettingsService } from '../infrastructure/services/settings.service';
```

---

## 🧪 FASE 12: TESTING

### 12.1. Unit Tests

```typescript
// __tests__/storage.service.spec.ts
// __tests__/image-download.service.spec.ts
// __tests__/image-processing.service.spec.ts
// __tests__/audio-embed.service.spec.ts
// __tests__/settings.service.spec.ts
```

### 12.2. Integration Tests

```typescript
// __tests__/external-metadata-download.e2e.spec.ts

describe('External Metadata Download (E2E)', () => {
  it('should download artist images locally', async () => {
    const artist = await createTestArtist();
    await metadataService.enrichArtist(artist.id);

    const updated = await prisma.artist.findUnique({ where: { id: artist.id } });
    expect(updated.backgroundImageUrl).toContain('/storage/metadata/artists/');
    expect(fs.existsSync(updated.backgroundImageUrl)).toBe(true);
  });

  it('should download album cover to album folder', async () => {
    const album = await createTestAlbum();
    await metadataService.enrichAlbum(album.id);

    const coverPath = path.join(album.path, 'cover.jpg');
    expect(fs.existsSync(coverPath)).toBe(true);
  });
});
```

---

## 📦 RESUMEN DE ARCHIVOS A CREAR/MODIFICAR

### 🆕 NUEVOS (28 archivos):

**Schema & Migrations:**
1. `prisma/migrations/XXX_add_metadata_fields/migration.sql`
2. `prisma/migrations/XXX_create_settings_table/migration.sql`
3. `prisma/migrations/XXX_seed_default_settings/migration.sql`

**Domain:**
4. `domain/entities/storage-config.entity.ts`

**Infrastructure - Services:**
5. `infrastructure/services/storage.service.ts`
6. `infrastructure/services/image-download.service.ts`
7. `infrastructure/services/image-processing.service.ts`
8. `infrastructure/services/audio-embed.service.ts`
9. `infrastructure/services/settings.service.ts`
10. `infrastructure/services/cleanup.service.ts`

**Infrastructure - Repository:**
11. `infrastructure/persistence/settings.repository.ts`

**Infrastructure - Jobs:**
12. `infrastructure/jobs/metadata-cleanup.job.ts`

**Application:**
13. `application/image.service.ts`

**Presentation:**
14. `presentation/images.controller.ts`
15. `presentation/admin-settings.controller.ts`
16. `presentation/metadata-embed.controller.ts`

**DTOs:**
17. `presentation/dto/update-settings.dto.ts`
18. `presentation/dto/embed-cover.dto.ts`

**Tests:**
19. `__tests__/storage.service.spec.ts`
20. `__tests__/image-download.service.spec.ts`
21. `__tests__/image-processing.service.spec.ts`
22. `__tests__/audio-embed.service.spec.ts`
23. `__tests__/settings.service.spec.ts`
24. `__tests__/cleanup.service.spec.ts`
25. `__tests__/external-metadata-download.e2e.spec.ts`

**Config:**
26. `config/storage.config.ts`

**Documentation:**
27. Este archivo (`IMPLEMENTATION_PLAN.md`)
28. `README.md` (actualizar)

### ✏️ MODIFICAR (6 archivos):

1. `prisma/schema.prisma` - Añadir campos
2. `application/external-metadata.service.ts` - Lógica de descarga
3. `domain/entities/artist-images.entity.ts` - Helpers
4. `domain/entities/album-cover.entity.ts` - Helpers
5. `external-metadata.module.ts` - Registrar nuevos servicios
6. `features/scanner/scanner.service.ts` - Auto-enriquecimiento

---

## 🔢 ORDEN DE IMPLEMENTACIÓN RECOMENDADO

### Sprint 1: Fundamentos (2-3 días)
1. ✅ Schema y migraciones
2. ✅ Tabla Settings + seed
3. ✅ SettingsService + Repository
4. ✅ StorageService

### Sprint 2: Descarga (2-3 días)
5. ✅ ImageDownloadService
6. ✅ ImageProcessingService (opcional)
7. ✅ Actualizar ExternalMetadataService
8. ✅ Tests unitarios

### Sprint 3: API y Admin (2-3 días)
9. ✅ ImagesController (servir imágenes)
10. ✅ AdminSettingsController
11. ✅ Integración con agents

### Sprint 4: Features avanzados (3-4 días)
12. ✅ AudioEmbedService
13. ✅ MetadataEmbedController
14. ✅ CleanupService + Cron
15. ✅ Integración con Scanner

### Sprint 5: Testing y Docs (1-2 días)
16. ✅ Tests E2E
17. ✅ Documentación
18. ✅ README updates

**Total estimado: 10-15 días**

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### Seguridad:
- ✅ Validar paths para evitar directory traversal
- ✅ Limitar tamaño de imágenes descargadas
- ✅ Validar formato de imágenes
- ✅ Rate limiting en endpoints de descarga

### Performance:
- ✅ Descargar imágenes en background (queues)
- ✅ Usar streams para archivos grandes
- ✅ Comprimir imágenes antes de guardar
- ✅ Cache headers agresivos para imágenes

### Mantenimiento:
- ✅ Logging detallado
- ✅ Métricas de uso de storage
- ✅ Alertas si storage excede límites
- ✅ Backup automático antes de embed

### Usabilidad:
- ✅ UI clara para confirmar acciones destructivas
- ✅ Progreso en tiempo real (WebSocket)
- ✅ Rollback en caso de error
- ✅ Defaults sensatos

---

## 🎯 SIGUIENTE PASO

¿Por dónde quieres empezar?

**Opción A:** Empezar por Schema + Settings (fundamentos)
**Opción B:** Empezar por StorageService + ImageDownload (core)
**Opción C:** Revisar y ajustar plan antes de implementar
