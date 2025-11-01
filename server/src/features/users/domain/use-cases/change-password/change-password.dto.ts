export interface ChangePasswordInput {
  userId: string;
  currentPassword?: string; // Opcional cuando mustChangePassword es true
  newPassword: string;
}