import { ApiProperty } from '@nestjs/swagger';
import { ResetUserPasswordOutput } from '@features/admin/domain/use-cases';

export class ResetPasswordResponseDto {
  @ApiProperty({
    description: 'Contraseña temporal generada que el administrador debe comunicar al usuario',
    example: 'X7h4Km2p',
  })
  temporaryPassword: string;

  static fromDomain(data: ResetUserPasswordOutput): ResetPasswordResponseDto {
    return {
      temporaryPassword: data.temporaryPassword,
    };
  }
}
