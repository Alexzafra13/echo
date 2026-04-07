import { IsString, IsBoolean, IsOptional, MinLength, IsNotEmpty, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserRequestDto {
  @ApiProperty({
    description: 'Username for the new user (alphanumeric and underscores only)',
    example: 'new_user',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Username cannot be empty' })
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(50, { message: 'Username cannot exceed 50 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
  username!: string;

  @ApiPropertyOptional({
    description: 'Display name',
    example: 'New User',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Whether user should have admin privileges',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isAdmin?: boolean;
}
