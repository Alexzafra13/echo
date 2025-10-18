/**
 * RegisterUserInput - Datos de entrada
 */
export interface RegisterUserInput {
  username: string;
  email?: string;
  password: string;
  name?: string;
}

/**
 * RegisterUserOutput - Datos de salida
 */
export interface RegisterUserOutput {
  user: {
    id: string;
    username: string;
    email?: string;
    name?: string;
  };
  accessToken: string;
  refreshToken: string;
}