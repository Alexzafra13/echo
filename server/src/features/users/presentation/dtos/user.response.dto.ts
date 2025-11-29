import { Expose } from 'class-transformer';
import { UpdateProfileOutput } from '../../domain/use-cases/update-profile/update-profile.dto';

export class UserResponseDto {
  @Expose()
  id!: string;

  @Expose()
  username!: string;

  @Expose()
  name?: string;

  @Expose()
  avatarUrl?: string;

  static fromDomain(data: UpdateProfileOutput): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = data.id;
    dto.username = data.username;
    dto.name = data.name;
    // avatarUrl will be constructed in the controller or by a helper
    dto.avatarUrl = data.id ? `/api/images/users/${data.id}/avatar` : undefined;
    return dto;
  }
}
