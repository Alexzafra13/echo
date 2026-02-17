export interface ResetUserPasswordInput {
  userId: string;
  adminId?: string;
}

export interface ResetUserPasswordOutput {
  temporaryPassword: string;
}
