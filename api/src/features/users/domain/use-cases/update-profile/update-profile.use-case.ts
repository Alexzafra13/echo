import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { NotFoundError } from '@shared/errors';
import { UpdateProfileInput, UpdateProfileOutput } from './update-profile.dto';

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: UpdateProfileInput): Promise<UpdateProfileOutput> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    const updatedUser = await this.userRepository.updatePartial(input.userId, {
      name: input.name,
    });

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
    };
  }
}
