import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeThemeRequestDto {
  @ApiProperty({
    description: 'UI theme preference',
    example: 'dark',
    enum: ['dark', 'light'],
  })
  @IsString()
  @IsIn(['dark', 'light'])
  theme!: string;
}
