import { IsString, MinLength } from 'class-validator';

export class ChangePasswordRequestDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}