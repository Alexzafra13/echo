import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '../../ports/user-repository.port';
import { NotFoundError } from '@shared/errors';
import { DateUtil } from '@shared/utils/date.util';
import { UpdateLastLoginInput } from './update-last-login.dto';

/**
 * UpdateLastLoginUseCase - Actualiza la fecha de último login
 * 
 * Responsabilidad:
 * - Verificar que el usuario exista
 * - Actualizar SOLO lastLoginAt
 */
@Injectable()
export class UpdateLastLoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: UpdateLastLoginInput): Promise<void> {
    // 1. Verificar que usuario existe
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    // 2. Actualizar SOLO lastLoginAt
    // ✅ Simple, directo, seguro
    // ✅ NO necesita reconstruir la entidad completa
    await this.userRepository.updatePartial(input.userId, {
      lastLoginAt: DateUtil.now(),
    });
  }
}