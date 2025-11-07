import { ApiProperty } from '@nestjs/swagger';
import { UpdateUserOutput } from '@features/admin/domain/use-cases';

export class UpdateUserResponseDto {
  @ApiProperty({
    description: 'ID del usuario',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Username del usuario',
    example: 'jperez',
  })
  username: string;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'juan@example.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Si el usuario es administrador',
    example: false,
  })
  isAdmin: boolean;

  @ApiProperty({
    description: 'Si la cuenta está activa',
    example: true,
  })
  isActive: boolean;

  static fromDomain(data: UpdateUserOutput): UpdateUserResponseDto {
    return {
      id: data.id,
      username: data.username,
      email: data.email,
      name: data.name,
      isAdmin: data.isAdmin,
      isActive: data.isActive,
    };
  }
}
