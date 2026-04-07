import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplyArtistAvatarOutput } from '../../infrastructure/use-cases/apply-artist-avatar';

export class ApplyArtistAvatarResponseDto {
  @ApiProperty({ description: 'Whether the artist avatar was applied successfully', example: true })
  @Expose()
  success!: boolean;

  @ApiProperty({
    description: 'Human-readable result message',
    example: 'Artist avatar applied successfully',
  })
  @Expose()
  message!: string;

  @ApiPropertyOptional({
    description: 'Path to the applied avatar image',
    example: '/avatars/artist-abc123.jpg',
  })
  @Expose()
  imagePath?: string;

  static fromDomain(data: ApplyArtistAvatarOutput): ApplyArtistAvatarResponseDto {
    const dto = new ApplyArtistAvatarResponseDto();
    dto.success = data.success;
    dto.message = data.message;
    dto.imagePath = data.imagePath;
    return dto;
  }
}
