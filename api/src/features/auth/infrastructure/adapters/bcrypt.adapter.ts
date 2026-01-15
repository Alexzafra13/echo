import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IPasswordService } from '../../domain/ports/password-service.port';

/**
 * BcryptAdapter - Implementa IPasswordService con bcryptjs
 */
@Injectable()
export class BcryptAdapter implements IPasswordService {
  private readonly rounds = 12;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.rounds);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}