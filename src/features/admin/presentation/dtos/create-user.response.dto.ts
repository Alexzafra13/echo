export class CreateUserResponseDto {
  user!: {
    id: string;
    username: string;
    email?: string;
    name?: string;
    isAdmin: boolean;
  };
  temporaryPassword!: string;

  static fromDomain(data: any): CreateUserResponseDto {
    const dto = new CreateUserResponseDto();
    dto.user = data.user;
    dto.temporaryPassword = data.temporaryPassword;
    return dto;
  }
}