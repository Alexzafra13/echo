import { IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserRequestDto {
  @ApiProperty({
    description: 'Username for the new user',
    example: 'new_user',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
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
