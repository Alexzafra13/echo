import { Expose, Type } from 'class-transformer';
import { ListUsersOutput } from '../../domain/use-cases/list-users/list-users.dto';

export class UserItemDto {
  @Expose()
  id!: string;

  @Expose()
  username!: string;

  @Expose()
  email?: string;

  @Expose()
  name?: string;

  @Expose()
  isAdmin!: boolean;

  @Expose()
  isActive!: boolean;

  @Expose()
  mustChangePassword!: boolean;

  @Expose()
  lastLoginAt?: Date;

  @Expose()
  createdAt!: Date;
}

export class ListUsersResponseDto {
  @Expose()
  @Type(() => UserItemDto)
  users!: UserItemDto[];

  @Expose()
  total!: number;

  static fromDomain(data: ListUsersOutput): ListUsersResponseDto {
    const dto = new ListUsersResponseDto();
    dto.users = data.users.map(user => {
      const userDto = new UserItemDto();
      userDto.id = user.id;
      userDto.username = user.username;
      userDto.email = user.email;
      userDto.name = user.name;
      userDto.isAdmin = user.isAdmin;
      userDto.isActive = user.isActive;
      userDto.mustChangePassword = user.mustChangePassword;
      userDto.lastLoginAt = user.lastLoginAt;
      userDto.createdAt = user.createdAt;
      return userDto;
    });
    dto.total = data.total;
    return dto;
  }
}
