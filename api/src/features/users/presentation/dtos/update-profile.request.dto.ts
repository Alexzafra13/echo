import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileRequestDto {
  @ApiPropertyOptional({
    description: 'Display name',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  name?: string;
}
