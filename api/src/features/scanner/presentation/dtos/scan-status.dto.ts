import { ApiProperty } from '@nestjs/swagger';

/**
 * ScanStatusResponseDto - DTO para respuesta de estado de escaneo
 */
export class ScanStatusResponseDto {
  @ApiProperty({ description: 'ID del escaneo' })
  id!: string;

  @ApiProperty({ description: 'Estado del escaneo', enum: ['pending', 'running', 'completed', 'failed'] })
  status!: string;

  @ApiProperty({ description: 'Fecha de inicio' })
  startedAt!: Date;

  @ApiProperty({ description: 'Fecha de finalización', required: false })
  finishedAt?: Date;

  @ApiProperty({ description: 'Tracks añadidos' })
  tracksAdded!: number;

  @ApiProperty({ description: 'Tracks actualizados' })
  tracksUpdated!: number;

  @ApiProperty({ description: 'Tracks eliminados' })
  tracksDeleted!: number;

  @ApiProperty({ description: 'Total de cambios' })
  totalChanges!: number;

  @ApiProperty({ description: 'Duración en milisegundos', required: false })
  durationMs?: number;

  @ApiProperty({ description: 'Mensaje de error', required: false })
  errorMessage?: string;
}
