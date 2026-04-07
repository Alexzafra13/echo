export interface DeleteUserInput {
  userId: string;
  adminId?: string;
}

export interface DeleteUserOutput {
  success: boolean;
}
