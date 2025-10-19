import { Expose } from 'class-transformer';
import { LoginOutput } from '../../domain/use-cases';

export class UserResponseDto {
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
}

export class AuthResponseDto {
  @Expose()
  user!: UserResponseDto;

  @Expose()
  accessToken!: string;

  @Expose()
  refreshToken!: string;

  @Expose()
  mustChangePassword!: boolean;  

  static fromDomain(data: LoginOutput): AuthResponseDto {
    const dto = new AuthResponseDto();
    
    dto.user = new UserResponseDto();
    dto.user.id = data.user.id;
    dto.user.username = data.user.username;
    dto.user.email = data.user.email;
    dto.user.name = data.user.name;
    dto.user.isAdmin = data.user.isAdmin;  
    
    dto.accessToken = data.accessToken;
    dto.refreshToken = data.refreshToken;
    dto.mustChangePassword = data.mustChangePassword;  
    
    return dto;
  }
}

export class RefreshTokenResponseDto {
  @Expose()
  accessToken!: string;

  @Expose()
  refreshToken!: string;

  static fromDomain(data: any): RefreshTokenResponseDto {
    const dto = new RefreshTokenResponseDto();
    dto.accessToken = data.accessToken;
    dto.refreshToken = data.refreshToken;
    return dto;
  }
}