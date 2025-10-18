import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  email?: string;

  @Expose()
  name?: string;
}

export class AuthResponseDto {
  @Expose()
  user: UserResponseDto;

  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;

  static fromDomain(data: any): AuthResponseDto {
    const dto = new AuthResponseDto();
    dto.user = new UserResponseDto();
    dto.user.id = data.user.id;
    dto.user.username = data.user.username;
    dto.user.email = data.user.email;
    dto.user.name = data.user.name;
    dto.accessToken = data.accessToken;
    dto.refreshToken = data.refreshToken;
    return dto;
  }
}

export class RefreshTokenResponseDto {
  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;

  static fromDomain(data: any): RefreshTokenResponseDto {
    const dto = new RefreshTokenResponseDto();
    dto.accessToken = data.accessToken;
    dto.refreshToken = data.refreshToken;
    return dto;
  }
}