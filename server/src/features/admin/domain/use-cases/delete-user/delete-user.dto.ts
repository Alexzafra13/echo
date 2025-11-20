export interface DeleteUserInput {
  userId: string;
  adminId?: string; // ID of the admin performing the action (for audit logging)
}

export interface DeleteUserOutput {
  success: boolean;
}
