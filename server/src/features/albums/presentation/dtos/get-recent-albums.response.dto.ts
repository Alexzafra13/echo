import { ApiProperty } from '@nestjs/swagger';
import { AlbumResponseDto } from './album.response.dto';

/**
 * GetRecentAlbumsResponseDto - DTO de respuesta para álbumes recientes
 */
export class GetRecentAlbumsResponseDto {
  @ApiProperty({
    type: [AlbumResponseDto],
    description: 'Lista de álbumes recientes'
  })
  data!: AlbumResponseDto[];

  static fromDomain(albums: any[]): GetRecentAlbumsResponseDto {
    const dto = new GetRecentAlbumsResponseDto();
    dto.data = albums.map((album) => AlbumResponseDto.fromDomain(album));
    return dto;
  }
}
