import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchAlbumCoversRequestDto {
  @ApiProperty({
    description: 'The UUID of the album to search covers for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  albumId!: string;
}
