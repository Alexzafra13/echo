import { IsString, IsEmail, IsBoolean, IsOptional, MinLength } from 'class-validator';

export class CreateUserRequestDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isAdmin?: boolean;
}