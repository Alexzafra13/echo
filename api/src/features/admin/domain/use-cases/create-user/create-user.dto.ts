export interface CreateUserInput {
  username: string;
  name?: string;
  isAdmin?: boolean;
  adminId?: string;
}

export interface CreateUserOutput {
  user: {
    id: string;
    username: string;
    name?: string;
    isAdmin: boolean;
  };
  temporaryPassword: string;
}