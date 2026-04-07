import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { NotFoundError, ValidationError } from '@shared/errors';
import { ChangeThemeInput } from './change-theme.dto';

@Injectable()
export class ChangeThemeUseCase {
  private readonly VALID_THEMES = ['dark', 'light'];

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: ChangeThemeInput): Promise<void> {
    if (!this.VALID_THEMES.includes(input.theme)) {
      throw new ValidationError(
        `Invalid theme. Must be one of: ${this.VALID_THEMES.join(', ')}`,
      );
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    await this.userRepository.updatePartial(input.userId, {
      theme: input.theme,
    });
  }
}