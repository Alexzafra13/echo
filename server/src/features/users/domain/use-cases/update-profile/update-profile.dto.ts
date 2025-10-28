export interface UpdateProfileInput {
  userId: string;
  name?: string;
  email?: string;
}

export interface UpdateProfileOutput {
  id: string;
  username: string;
  email?: string;
  name?: string;
}