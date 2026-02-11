export interface LogoutInput {
  token: string;
  userId: string;
  username: string;
  // Expiración del token para TTL en blacklist
  tokenExp: number;
}
