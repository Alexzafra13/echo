/**
 * LoginInput - Datos que entra el use case
 */
export interface LoginInput {
  username: string;
  password: string;
}

/**
 * LoginOutput - Datos que retorna el use case
 */
export interface LoginOutput {
  user: {
    id: string;
    username: string;
    email: string;
    name?: string;
  };
  accessToken: string;
  refreshToken: string;
}