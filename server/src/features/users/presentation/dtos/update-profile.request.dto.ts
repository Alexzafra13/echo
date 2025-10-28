import { IsString, IsEmail, IsOptional } from 'class-validator';

export class UpdateProfileRequestDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}