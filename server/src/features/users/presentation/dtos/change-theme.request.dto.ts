import { IsString, IsIn } from 'class-validator';

export class ChangeThemeRequestDto {
  @IsString()
  @IsIn(['dark', 'light'])
  theme!: string;
}