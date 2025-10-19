import { IsString, MinLength } from 'class-validator';

export class LoginRequestDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}