import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString } from 'class-validator';

/**
 * StartScanRequestDto - DTO para solicitud de inicio de escaneo
 */
export class StartScanRequestDto {
  @ApiProperty({
    description: 'Ruta del directorio a escanear',
    required: false,
    example: './uploads/music',
  })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({
    description: 'Escanear subdirectorios recursivamente',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  recursive?: boolean;

  @ApiProperty({
    description: 'Eliminar tracks que ya no existen en el filesystem',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  pruneDeleted?: boolean;
}

/**
 * StartScanResponseDto - DTO para respuesta de inicio de escaneo
 */
export class StartScanResponseDto {
  @ApiProperty({ description: 'ID del escaneo' })
  id!: string;

  @ApiProperty({ description: 'Estado del escaneo' })
  status!: string;

  @ApiProperty({ description: 'Fecha de inicio' })
  startedAt!: Date;

  @ApiProperty({ description: 'Mensaje informativo' })
  message!: string;
}
