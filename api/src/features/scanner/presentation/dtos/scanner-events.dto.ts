import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, Min, Max } from 'class-validator';

/**
 * Estado del escaneo
 */
export enum ScanStatus {
  PENDING = 'pending',
  SCANNING = 'scanning',
  AGGREGATING = 'aggregating',
  EXTRACTING_COVERS = 'extracting_covers',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * DTO para suscribirse a eventos de un scan
 */
export class SubscribeScanDto {
  @IsString()
  scanId!: string;
}

/**
 * DTO para evento de progreso del scan
 */
export class ScanProgressDto {
  @IsString()
  scanId!: string;

  @IsEnum(ScanStatus)
  status!: ScanStatus;

  @IsNumber()
  @Min(0)
  @Max(100)
  progress!: number; // Porcentaje 0-100

  @IsNumber()
  @Min(0)
  filesScanned!: number;

  @IsNumber()
  @Min(0)
  totalFiles!: number;

  @IsNumber()
  @Min(0)
  tracksCreated!: number;

  @IsNumber()
  @Min(0)
  albumsCreated!: number;

  @IsNumber()
  @Min(0)
  artistsCreated!: number;

  @IsNumber()
  @Min(0)
  coversExtracted!: number;

  @IsNumber()
  @Min(0)
  errors!: number;

  @IsOptional()
  @IsString()
  currentFile?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

/**
 * DTO para evento de error del scan
 */
export class ScanErrorDto {
  @IsString()
  scanId!: string;

  @IsString()
  file!: string;

  @IsString()
  error!: string;

  @IsString()
  timestamp!: string;
}

/**
 * DTO para evento de completado del scan
 */
export class ScanCompletedDto {
  @IsString()
  scanId!: string;

  @IsNumber()
  @Min(0)
  totalFiles!: number;

  @IsNumber()
  @Min(0)
  tracksCreated!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  tracksSkipped?: number; // Archivos no modificados (scan incremental)

  @IsNumber()
  @Min(0)
  albumsCreated!: number;

  @IsNumber()
  @Min(0)
  artistsCreated!: number;

  @IsNumber()
  @Min(0)
  coversExtracted!: number;

  @IsNumber()
  @Min(0)
  errors!: number;

  @IsNumber()
  @Min(0)
  duration!: number; // milisegundos

  @IsString()
  timestamp!: string;
}

/**
 * DTO para pausar el scan
 */
export class PauseScanDto {
  @IsString()
  scanId!: string;
}

/**
 * DTO para cancelar el scan
 */
export class CancelScanDto {
  @IsString()
  scanId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO para resumir el scan
 */
export class ResumeScanDto {
  @IsString()
  scanId!: string;
}

/**
 * DTO para evento de progreso del análisis LUFS
 */
export class LufsProgressDto {
  @IsBoolean()
  isRunning!: boolean;

  @IsNumber()
  @Min(0)
  pendingTracks!: number;

  @IsNumber()
  @Min(0)
  processedInSession!: number;

  @IsOptional()
  @IsString()
  estimatedTimeRemaining?: string | null;
}

/**
 * DTO para evento de progreso del análisis DJ (BPM, Key, Energy)
 */
export class DjProgressDto {
  @IsBoolean()
  isRunning!: boolean;

  @IsNumber()
  @Min(0)
  pendingTracks!: number;

  @IsNumber()
  @Min(0)
  processedInSession!: number;

  @IsOptional()
  @IsString()
  estimatedTimeRemaining?: string | null;
}

/**
 * Tipo de cambio en la biblioteca
 */
export enum LibraryChangeType {
  TRACK_MISSING = 'track_missing',    // Archivo desaparecido (marcado)
  TRACK_RECOVERED = 'track_recovered', // Archivo recuperado
  TRACK_DELETED = 'track_deleted',     // Eliminado de la BD
  ALBUM_DELETED = 'album_deleted',
  ARTIST_DELETED = 'artist_deleted',
  TRACK_ADDED = 'track_added',
  TRACK_UPDATED = 'track_updated',
}

/**
 * DTO para evento de cambio en la biblioteca (archivos añadidos/eliminados)
 */
export class LibraryChangeDto {
  @IsEnum(LibraryChangeType)
  type!: LibraryChangeType;

  @IsOptional()
  @IsString()
  trackId?: string;

  @IsOptional()
  @IsString()
  trackTitle?: string;

  @IsOptional()
  @IsString()
  albumId?: string;

  @IsOptional()
  @IsBoolean()
  albumDeleted?: boolean;

  @IsOptional()
  @IsString()
  artistId?: string;

  @IsOptional()
  @IsBoolean()
  artistDeleted?: boolean;

  @IsString()
  timestamp!: string;
}
