import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUrl, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

// ============================================
// Request DTOs
// ============================================

export class CreateInvitationTokenDto {
  @ApiPropertyOptional({
    description: 'Nombre descriptivo para el token',
    example: 'Token para Juan',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Días hasta que expire el token',
    default: 7,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  @Type(() => Number)
  expiresInDays?: number;

  @ApiPropertyOptional({
    description: 'Número máximo de usos del token',
    default: 1,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  maxUses?: number;
}

export class ConnectToServerDto {
  @ApiProperty({
    description: 'URL del servidor al que conectar',
    example: 'https://music.example.com',
  })
  @IsUrl({ require_tld: false })
  serverUrl!: string;

  @ApiProperty({
    description: 'Token de invitación proporcionado por el servidor',
    example: 'ABCD-1234-EFGH-5678',
  })
  @IsString()
  invitationToken!: string;

  @ApiPropertyOptional({
    description: 'Nombre personalizado para identificar el servidor',
    example: 'Servidor de Juan',
  })
  @IsOptional()
  @IsString()
  serverName?: string;

  @ApiPropertyOptional({
    description: 'URL pública de nuestro servidor (requerida si requestMutual es true)',
    example: 'https://mi-servidor.example.com',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  localServerUrl?: string;

  @ApiPropertyOptional({
    description: 'Solicitar federación mutua (el servidor remoto podrá ver nuestra biblioteca)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requestMutual?: boolean;
}

export class AcceptConnectionDto {
  @ApiProperty({
    description: 'Token de invitación',
    example: 'ABCD-1234-EFGH-5678',
  })
  @IsString()
  invitationToken!: string;

  @ApiProperty({
    description: 'Nombre del servidor que se conecta',
    example: 'Echo Server de María',
  })
  @IsString()
  serverName!: string;

  @ApiPropertyOptional({
    description: 'URL del servidor que se conecta',
    example: 'https://maria.echo.local',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  serverUrl?: string;

  @ApiPropertyOptional({
    description: 'Si se solicita federación mutua',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requestMutual?: boolean;

  @ApiPropertyOptional({
    description: 'Token de invitación del servidor remoto para establecer conexión mutua',
    example: 'WXYZ-5678-ABCD-1234',
  })
  @IsOptional()
  @IsString()
  mutualInvitationToken?: string;
}

export class UpdatePermissionsDto {
  @ApiPropertyOptional({
    description: 'Permitir navegar la biblioteca',
  })
  @IsOptional()
  @IsBoolean()
  canBrowse?: boolean;

  @ApiPropertyOptional({
    description: 'Permitir hacer streaming',
  })
  @IsOptional()
  @IsBoolean()
  canStream?: boolean;

  @ApiPropertyOptional({
    description: 'Permitir descargar álbumes',
  })
  @IsOptional()
  @IsBoolean()
  canDownload?: boolean;
}

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Número de página',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Elementos por página',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Término de búsqueda',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

// ============================================
// Response DTOs
// ============================================

export class InvitationTokenResponseDto {
  @ApiProperty({ description: 'ID del token' })
  id!: string;

  @ApiProperty({
    description: 'Token de invitación',
    example: 'ABCD-1234-EFGH-5678',
  })
  token!: string;

  @ApiPropertyOptional({ description: 'Nombre descriptivo' })
  name?: string;

  @ApiProperty({ description: 'Fecha de expiración' })
  expiresAt!: Date;

  @ApiProperty({ description: 'Número máximo de usos' })
  maxUses!: number;

  @ApiProperty({ description: 'Usos actuales' })
  currentUses!: number;

  @ApiProperty({ description: 'Si el token está agotado' })
  isUsed!: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt!: Date;
}

export class ConnectedServerResponseDto {
  @ApiProperty({ description: 'ID del servidor conectado' })
  id!: string;

  @ApiProperty({ description: 'Nombre del servidor' })
  name!: string;

  @ApiProperty({ description: 'URL base del servidor' })
  baseUrl!: string;

  @ApiProperty({ description: 'Si está activo' })
  isActive!: boolean;

  @ApiProperty({ description: 'Si el servidor está online' })
  isOnline!: boolean;

  @ApiPropertyOptional({ description: 'Última vez que estuvo online' })
  lastOnlineAt?: Date;

  @ApiPropertyOptional({ description: 'Última vez que se verificó el estado' })
  lastCheckedAt?: Date;

  @ApiProperty({ description: 'Número de álbums en el servidor' })
  remoteAlbumCount!: number;

  @ApiProperty({ description: 'Número de tracks en el servidor' })
  remoteTrackCount!: number;

  @ApiProperty({ description: 'Número de artistas en el servidor' })
  remoteArtistCount!: number;

  @ApiPropertyOptional({ description: 'Última sincronización' })
  lastSyncAt?: Date;

  @ApiPropertyOptional({ description: 'Último error' })
  lastError?: string;

  @ApiPropertyOptional({ description: 'Fecha del último error' })
  lastErrorAt?: Date;

  @ApiProperty({ description: 'Fecha de conexión' })
  createdAt!: Date;
}

export class AccessTokenResponseDto {
  @ApiProperty({ description: 'ID del token de acceso' })
  id!: string;

  @ApiProperty({ description: 'Nombre del servidor que usa este token' })
  serverName!: string;

  @ApiPropertyOptional({ description: 'URL del servidor' })
  serverUrl?: string;

  @ApiProperty({ description: 'Permisos' })
  permissions!: {
    canBrowse: boolean;
    canStream: boolean;
    canDownload: boolean;
  };

  @ApiProperty({ description: 'Si está activo' })
  isActive!: boolean;

  @ApiPropertyOptional({ description: 'Último uso' })
  lastUsedAt?: Date;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'Estado de la solicitud de federación mutua',
    enum: ['none', 'pending', 'approved', 'rejected'],
  })
  mutualStatus?: string;
}

export class ServerInfoResponseDto {
  @ApiProperty({ description: 'Nombre del servidor' })
  name!: string;

  @ApiProperty({ description: 'Versión del servidor' })
  version!: string;

  @ApiProperty({ description: 'Número de álbums' })
  albumCount!: number;

  @ApiProperty({ description: 'Número de tracks' })
  trackCount!: number;

  @ApiProperty({ description: 'Número de artistas' })
  artistCount!: number;
}

export class ConnectionResponseDto {
  @ApiProperty({ description: 'Token de acceso generado' })
  accessToken!: string;

  @ApiProperty({ description: 'Información del servidor' })
  serverInfo!: ServerInfoResponseDto;
}

export class RemoteAlbumDto {
  @ApiProperty({ description: 'ID del álbum' })
  id!: string;

  @ApiProperty({ description: 'Nombre del álbum' })
  name!: string;

  @ApiProperty({ description: 'Nombre del artista' })
  artistName!: string;

  @ApiProperty({ description: 'ID del artista' })
  artistId!: string;

  @ApiPropertyOptional({ description: 'Año' })
  year?: number;

  @ApiProperty({ description: 'Número de canciones' })
  songCount!: number;

  @ApiProperty({ description: 'Duración total en segundos' })
  duration!: number;

  @ApiProperty({ description: 'Tamaño en bytes' })
  size!: number;

  @ApiPropertyOptional({ description: 'URL de la carátula' })
  coverUrl?: string;

  @ApiPropertyOptional({ description: 'Géneros' })
  genres?: string[];
}

export class RemoteTrackDto {
  @ApiProperty({ description: 'ID del track' })
  id!: string;

  @ApiProperty({ description: 'Título' })
  title!: string;

  @ApiProperty({ description: 'Nombre del artista' })
  artistName!: string;

  @ApiProperty({ description: 'ID del artista' })
  artistId!: string;

  @ApiProperty({ description: 'Nombre del álbum' })
  albumName!: string;

  @ApiProperty({ description: 'ID del álbum' })
  albumId!: string;

  @ApiPropertyOptional({ description: 'Número de pista' })
  trackNumber?: number;

  @ApiPropertyOptional({ description: 'Número de disco' })
  discNumber?: number;

  @ApiProperty({ description: 'Duración en segundos' })
  duration!: number;

  @ApiProperty({ description: 'Tamaño en bytes' })
  size!: number;

  @ApiPropertyOptional({ description: 'Bitrate' })
  bitRate?: number;

  @ApiPropertyOptional({ description: 'Formato de audio' })
  format?: string;
}

export class RemoteLibraryResponseDto {
  @ApiProperty({ type: [RemoteAlbumDto], description: 'Lista de álbums' })
  albums!: RemoteAlbumDto[];

  @ApiProperty({ description: 'Total de álbums' })
  totalAlbums!: number;

  @ApiProperty({ description: 'Total de tracks' })
  totalTracks!: number;

  @ApiProperty({ description: 'Total de artistas' })
  totalArtists!: number;
}

// ============================================
// Shared Libraries DTOs (Aggregated from all servers)
// ============================================

export class SharedAlbumDto extends RemoteAlbumDto {
  @ApiProperty({ description: 'ID del servidor de origen' })
  serverId!: string;

  @ApiProperty({ description: 'Nombre del servidor de origen' })
  serverName!: string;

  @ApiPropertyOptional({ description: 'Fecha de creación en el servidor remoto' })
  createdAt?: Date;
}

export class SharedAlbumsResponseDto {
  @ApiProperty({ type: [SharedAlbumDto], description: 'Lista de álbums compartidos' })
  albums!: SharedAlbumDto[];

  @ApiProperty({ description: 'Total de álbums' })
  total!: number;

  @ApiProperty({ description: 'Número de servidores consultados' })
  serverCount!: number;
}

export class SharedLibrariesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'ID de servidor específico (opcional, si no se especifica consulta todos)',
  })
  @IsOptional()
  @IsString()
  serverId?: string;
}
