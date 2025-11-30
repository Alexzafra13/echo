import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeLanguageRequestDto {
  @ApiProperty({
    description: 'Preferred language',
    example: 'es',
    enum: ['es', 'en'],
  })
  @IsString()
  @IsIn(['es', 'en'])
  language!: string;
}