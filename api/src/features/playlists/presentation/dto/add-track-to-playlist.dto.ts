import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { AddTrackToPlaylistOutput } from '../../domain/use-cases/add-track-to-playlist/add-track-to-playlist.dto';

export class AddTrackToPlaylistDto {
  @ApiProperty({
    description: 'ID del track a agregar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  trackId!: string;
}

export class AddTrackToPlaylistResponseDto {
  @ApiProperty({
    description: 'ID de la playlist',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  playlistId!: string;

  @ApiProperty({
    description: 'ID del track agregado',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  trackId!: string;

  @ApiProperty({
    description: 'Posición del track en la playlist',
    example: 1,
  })
  trackOrder!: number;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Mensaje de confirmación',
    example: 'Track added to playlist successfully',
  })
  message!: string;

  static fromDomain(output: AddTrackToPlaylistOutput): AddTrackToPlaylistResponseDto {
    const dto = new AddTrackToPlaylistResponseDto();
    dto.playlistId = output.playlistId;
    dto.trackId = output.trackId;
    dto.trackOrder = output.trackOrder;
    dto.createdAt = output.createdAt;
    dto.message = output.message;
    return dto;
  }
}
