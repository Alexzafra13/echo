import { IsString, IsIn } from 'class-validator';

export class ChangeLanguageRequestDto {
  @IsString()
  @IsIn(['es', 'en'])
  language!: string;
}