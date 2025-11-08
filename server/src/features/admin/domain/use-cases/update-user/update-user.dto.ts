export interface UpdateUserInput {
  userId: string;
  username?: string;
  name?: string;
  email?: string;
  isAdmin?: boolean;
  isActive?: boolean;
}

export interface UpdateUserOutput {
  id: string;
  username: string;
  email?: string;
  name?: string;
  isAdmin: boolean;
  isActive: boolean;
}
