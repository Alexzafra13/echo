import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ScansHistoryQueryDto - Query params para historial de escaneos
 */
export class ScansHistoryQueryDto {
  @ApiProperty({
    description: 'Página (empezando en 1)',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Límite de resultados por página',
    required: false,
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

/**
 * ScanHistoryItemDto - Item individual del historial
 */
export class ScanHistoryItemDto {
  @ApiProperty({ description: 'ID del escaneo' })
  id: string;

  @ApiProperty({ description: 'Estado del escaneo' })
  status: string;

  @ApiProperty({ description: 'Fecha de inicio' })
  startedAt: Date;

  @ApiProperty({ description: 'Fecha de finalización', required: false })
  finishedAt?: Date;

  @ApiProperty({ description: 'Tracks añadidos' })
  tracksAdded: number;

  @ApiProperty({ description: 'Tracks actualizados' })
  tracksUpdated: number;

  @ApiProperty({ description: 'Tracks eliminados' })
  tracksDeleted: number;

  @ApiProperty({ description: 'Total de cambios' })
  totalChanges: number;

  @ApiProperty({ description: 'Duración en ms', required: false })
  durationMs?: number;

  @ApiProperty({ description: 'Mensaje de error', required: false })
  errorMessage?: string;
}

/**
 * ScansHistoryResponseDto - Respuesta con historial de escaneos
 */
export class ScansHistoryResponseDto {
  @ApiProperty({ description: 'Lista de escaneos', type: [ScanHistoryItemDto] })
  scans: ScanHistoryItemDto[];

  @ApiProperty({ description: 'Total de escaneos' })
  total: number;

  @ApiProperty({ description: 'Página actual' })
  page: number;

  @ApiProperty({ description: 'Límite por página' })
  limit: number;

  @ApiProperty({ description: 'Total de páginas' })
  totalPages: number;
}
