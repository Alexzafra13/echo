export interface CreateUserInput {
  username: string;
  email?: string;
  name?: string;
  isAdmin?: boolean;
  adminId?: string; // ID of the admin performing the action (for audit logging)
}

export interface CreateUserOutput {
  user: {
    id: string;
    username: string;
    email?: string;
    name?: string;
    isAdmin: boolean;
  };
  temporaryPassword: string;
}