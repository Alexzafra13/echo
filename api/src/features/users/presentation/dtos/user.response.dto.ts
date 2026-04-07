import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateProfileOutput } from '../../domain/use-cases/update-profile/update-profile.dto';

export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'Username',
    example: 'john_doe',
  })
  @Expose()
  username!: string;

  @ApiPropertyOptional({
    description: 'Display name',
    example: 'John Doe',
  })
  @Expose()
  name?: string;

  @ApiPropertyOptional({
    description: 'Avatar image URL',
    example: '/api/images/users/550e8400-e29b-41d4-a716-446655440000/avatar',
  })
  @Expose()
  avatarUrl?: string;

  static fromDomain(data: UpdateProfileOutput): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = data.id;
    dto.username = data.username;
    dto.name = data.name;
    dto.avatarUrl = data.id ? `/api/images/users/${data.id}/avatar` : undefined;
    return dto;
  }
}
