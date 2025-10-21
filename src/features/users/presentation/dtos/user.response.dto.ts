import { Expose } from 'class-transformer';
import { UpdateProfileOutput } from '../../domain/use-cases/update-profile/update-profile.dto';

export class UserResponseDto {
  @Expose()
  id!: string;

  @Expose()
  username!: string;

  @Expose()
  email?: string;

  @Expose()
  name?: string;

  static fromDomain(data: UpdateProfileOutput): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = data.id;
    dto.username = data.username;
    dto.email = data.email;
    dto.name = data.name;
    return dto;
  }
}
