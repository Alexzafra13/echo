import { generateUuid } from '@shared/utils';

/**
 * Interfaz que define la estructura de propiedades del User
 * Esta es la forma que el User tiene internamente
 */
export interface UserProps {
  id: string;
  username: string;
  email?: string;
  passwordHash: string;
  name?: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Entity - Representa un usuario en el dominio
 *
 * Responsabilidades:
 * - Encapsular las propiedades de un usuario
 * - Proporcionar getters para acceder a los datos
 * - Crear nuevos usuarios con factory method
 * - Convertir a primitivos (para mapear a BD o DTOs)
 *
 * NO tiene métodos de negocio complejos (eso va en Use Cases)
 */
export class User {
  private props: UserProps;

  /**
   * Constructor privado - no llamar directamente
   * Usar User.create() en su lugar
   */
  constructor(props: UserProps) {
    this.props = props;
  }

  /**
   * Factory method para crear un nuevo User
   * Genera automáticamente: id (UUID), createdAt, updatedAt
   */
  static create(
    props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): User {
    return new User({
      ...props,
      id: generateUuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Factory method para reconstruir un User desde BD
   * Se usa cuando traes datos de Prisma
   */
  static reconstruct(props: UserProps): User {
    return new User(props);
  }

  // ============ GETTERS (Solo lectura) ============

  get id(): string {
    return this.props.id;
  }

  get username(): string {
    return this.props.username;
  }

  get email(): string | undefined {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get name(): string | undefined {
    return this.props.name;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get isAdmin(): boolean {
    return this.props.isAdmin;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // ============ MÉTODOS DE CONVERSIÓN ============

  /**
   * Retorna todas las propiedades del usuario como un objeto plano
   * Útil para mapear a Prisma o DTOs
   */
  toPrimitives(): UserProps {
    return { ...this.props };
  }
}