import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ListUsersOutput } from '../../domain/use-cases/list-users/list-users.dto';

export class UserItemDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'Username',
    example: 'john_doe',
  })
  @Expose()
  username!: string;

  @ApiPropertyOptional({
    description: 'Display name',
    example: 'John Doe',
  })
  @Expose()
  name?: string;

  @ApiProperty({
    description: 'Whether user has admin privileges',
    example: false,
  })
  @Expose()
  isAdmin!: boolean;

  @ApiProperty({
    description: 'Whether user account is active',
    example: true,
  })
  @Expose()
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'Path to user avatar image',
    example: '/uploads/avatars/user-123.jpg',
  })
  @Expose()
  avatarPath?: string;

  @ApiProperty({
    description: 'Whether user must change password on next login',
    example: false,
  })
  @Expose()
  mustChangePassword!: boolean;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  @Expose()
  lastLoginAt?: Date;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  createdAt!: Date;

  @ApiProperty({
    description: 'Whether user is the system admin (cannot be deleted)',
    example: false,
  })
  @Expose()
  isSystemAdmin!: boolean;
}

export class ListUsersResponseDto {
  @ApiProperty({
    description: 'List of users',
    type: [UserItemDto],
  })
  @Expose()
  @Type(() => UserItemDto)
  users!: UserItemDto[];

  @ApiProperty({
    description: 'Total number of users',
    example: 25,
  })
  @Expose()
  total!: number;

  static fromDomain(data: ListUsersOutput): ListUsersResponseDto {
    const dto = new ListUsersResponseDto();
    dto.users = data.users.map(user => {
      const userDto = new UserItemDto();
      userDto.id = user.id;
      userDto.username = user.username;
      userDto.name = user.name;
      userDto.isAdmin = user.isAdmin;
      userDto.isActive = user.isActive;
      userDto.avatarPath = user.avatarPath;
      userDto.mustChangePassword = user.mustChangePassword;
      userDto.lastLoginAt = user.lastLoginAt;
      userDto.createdAt = user.createdAt;
      userDto.isSystemAdmin = user.isSystemAdmin;
      return userDto;
    });
    dto.total = data.total;
    return dto;
  }
}
