import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoginOutput, RefreshTokenOutput } from '../../domain/use-cases';

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

  @ApiProperty({
    description: 'Whether user has admin privileges',
    example: false,
  })
  @Expose()
  isAdmin!: boolean;

  @ApiPropertyOptional({
    description: 'Whether user has an avatar',
    example: true,
  })
  @Expose()
  hasAvatar?: boolean;

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-01-15T10:30:00.000Z',
  })
  @Expose()
  createdAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Authenticated user information',
    type: UserResponseDto,
  })
  @Expose()
  user!: UserResponseDto;

  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @Expose()
  accessToken!: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @Expose()
  refreshToken!: string;

  @ApiProperty({
    description: 'Whether user must change password on first login',
    example: false,
  })
  @Expose()
  mustChangePassword!: boolean;

  static fromDomain(data: LoginOutput): AuthResponseDto {
    const dto = new AuthResponseDto();

    dto.user = new UserResponseDto();
    dto.user.id = data.user.id;
    dto.user.username = data.user.username;
    dto.user.name = data.user.name;
    dto.user.isAdmin = data.user.isAdmin;
    dto.user.hasAvatar = !!data.user.avatarPath;
    dto.user.createdAt = data.user.createdAt;

    dto.accessToken = data.accessToken;
    dto.refreshToken = data.refreshToken;
    dto.mustChangePassword = data.mustChangePassword;

    return dto;
  }
}

export class RefreshTokenResponseDto {
  @ApiProperty({
    description: 'New JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @Expose()
  accessToken!: string;

  @ApiProperty({
    description: 'New JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @Expose()
  refreshToken!: string;

  static fromDomain(data: RefreshTokenOutput): RefreshTokenResponseDto {
    const dto = new RefreshTokenResponseDto();
    dto.accessToken = data.accessToken;
    dto.refreshToken = data.refreshToken;
    return dto;
  }
}
