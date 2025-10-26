import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNumber, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class TrackOrderDto {
  @ApiProperty({
    description: 'ID del track',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  trackId: string;

  @ApiProperty({
    description: 'Nuevo orden del track (0-based)',
    example: 0,
  })
  @IsNumber()
  order: number;
}

export class ReorderTracksDto {
  @ApiProperty({
    description: 'Array con el nuevo orden de los tracks',
    type: [TrackOrderDto],
    example: [
      { trackId: '123e4567-e89b-12d3-a456-426614174000', order: 0 },
      { trackId: '223e4567-e89b-12d3-a456-426614174001', order: 1 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TrackOrderDto)
  trackOrders: TrackOrderDto[];
}
