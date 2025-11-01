import { IsString, MinLength, IsOptional } from 'class-validator';

export class ChangePasswordRequestDto {
  @IsString()
  @IsOptional()
  currentPassword?: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}