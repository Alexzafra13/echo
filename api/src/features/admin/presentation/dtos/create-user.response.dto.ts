import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateUserOutput } from '../../domain/use-cases/create-user/create-user.dto';

class CreatedUserDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Username',
    example: 'new_user',
  })
  username!: string;

  @ApiPropertyOptional({
    description: 'Display name',
    example: 'New User',
  })
  name?: string;

  @ApiProperty({
    description: 'Whether user has admin privileges',
    example: false,
  })
  isAdmin!: boolean;
}

export class CreateUserResponseDto {
  @ApiProperty({
    description: 'Created user information',
    type: CreatedUserDto,
  })
  user!: CreatedUserDto;

  @ApiProperty({
    description: 'Temporary password for the new user (must be changed on first login)',
    example: 'Temp1234',
  })
  temporaryPassword!: string;

  static fromDomain(data: CreateUserOutput): CreateUserResponseDto {
    const dto = new CreateUserResponseDto();
    dto.user = data.user;
    dto.temporaryPassword = data.temporaryPassword;
    return dto;
  }
}
