export interface UpdateProfileInput {
  userId: string;
  name?: string;
}

export interface UpdateProfileOutput {
  id: string;
  username: string;
  name?: string;
}