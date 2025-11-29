import { IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';

export class CreateUserRequestDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isAdmin?: boolean;
}