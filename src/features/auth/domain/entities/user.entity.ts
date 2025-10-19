import { generateUuid } from '@shared/utils';
import { DateUtil } from '@shared/utils/date.util';

/**
 * Interfaz que define la estructura de propiedades del User
 */
export interface UserProps {
  id: string;
  username: string;
  email?: string;
  passwordHash: string;
  name?: string;
  isActive: boolean;
  isAdmin: boolean;
  theme: string;
  language: string;
  lastLoginAt?: Date;
  lastAccessAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Entity - Representa un usuario en el dominio
 *
 * Responsabilidades:
 * - Encapsular las propiedades de un usuario
 * - Proporcionar getters para acceder a los datos
 * - Factory methods para crear/reconstruir usuarios
 * - Convertir a primitivos
 *
 * NO tiene lógica de negocio (eso va en Use Cases o Domain Services)
 */
export class User {
  private props: UserProps;

  /**
   * Constructor privado - no llamar directamente
   * Usar User.create() o User.reconstruct() en su lugar
   */
  private constructor(props: UserProps) {
    this.props = props;
  }

  /**
   * Factory method para crear un nuevo User
   * Genera automáticamente: id (UUID), createdAt, updatedAt
   * Valores por defecto: theme='dark', language='es'
   */
  static create(
    props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt' | 'theme' | 'language' | 'lastLoginAt' | 'lastAccessAt'> & {
      theme?: string;
      language?: string;
    },
  ): User {
    return new User({
      ...props,
      id: generateUuid(),
      theme: props.theme || 'dark',
      language: props.language || 'es',
      lastLoginAt: undefined,
      lastAccessAt: undefined,
      createdAt: DateUtil.now(),
      updatedAt: DateUtil.now(),
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

  get theme(): string {
    return this.props.theme;
  }

  get language(): string {
    return this.props.language;
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  get lastAccessAt(): Date | undefined {
    return this.props.lastAccessAt;
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