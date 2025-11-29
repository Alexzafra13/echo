import { IsString, IsOptional } from 'class-validator';

export class UpdateProfileRequestDto {
  @IsString()
  @IsOptional()
  name?: string;
}
