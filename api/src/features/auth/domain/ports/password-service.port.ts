// Contrato para hashear y comparar contraseñas
export interface IPasswordService {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export const PASSWORD_SERVICE = 'IPasswordService';
