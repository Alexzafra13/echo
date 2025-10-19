import { generateUuid } from '@shared/utils';
import { DateUtil } from '@shared/utils/date.util';

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
  mustChangePassword: boolean;  // ← NUEVO
  lastLoginAt?: Date;
  lastAccessAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private props: UserProps;

  private constructor(props: UserProps) {
    this.props = props;
  }

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

  static reconstruct(props: UserProps): User {
    return new User(props);
  }

  // ============ GETTERS ============

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

  get mustChangePassword(): boolean {  // ← NUEVO
    return this.props.mustChangePassword;
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

  toPrimitives(): UserProps {
    return { ...this.props };
  }
}