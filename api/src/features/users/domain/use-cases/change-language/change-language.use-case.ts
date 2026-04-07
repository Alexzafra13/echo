import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { NotFoundError, ValidationError } from '@shared/errors';
import { ChangeLanguageInput } from './change-language.dto';

@Injectable()
export class ChangeLanguageUseCase {
  private readonly VALID_LANGUAGES = ['es', 'en'];

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: ChangeLanguageInput): Promise<void> {
    if (!this.VALID_LANGUAGES.includes(input.language)) {
      throw new ValidationError(
        `Invalid language. Must be one of: ${this.VALID_LANGUAGES.join(', ')}`,
      );
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    await this.userRepository.updatePartial(input.userId, {
      language: input.language,
    });
  }
}