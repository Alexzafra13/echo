export interface ResetUserPasswordInput {
  userId: string;
  adminId?: string; // ID of the admin performing the action (for audit logging)
}

export interface ResetUserPasswordOutput {
  temporaryPassword: string;
}
