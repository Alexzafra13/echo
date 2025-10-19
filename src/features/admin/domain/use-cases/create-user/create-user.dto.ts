export interface CreateUserInput {
  username: string;
  email?: string;
  name?: string;
  isAdmin?: boolean;
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