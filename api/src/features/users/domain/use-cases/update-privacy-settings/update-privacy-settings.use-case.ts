import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  IUserRepository,
  UserUpdateableFields,
} from '@features/auth/domain/ports';
import { NotFoundError } from '@shared/errors';
import {
  UpdatePrivacySettingsInput,
  UpdatePrivacySettingsOutput,
} from './update-privacy-settings.dto';

@Injectable()
export class UpdatePrivacySettingsUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(input: UpdatePrivacySettingsInput): Promise<UpdatePrivacySettingsOutput> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    const updateData: Partial<UserUpdateableFields> = {};

    if (input.isPublicProfile !== undefined) {
      updateData.isPublicProfile = input.isPublicProfile;
    }
    if (input.showTopTracks !== undefined) {
      updateData.showTopTracks = input.showTopTracks;
    }
    if (input.showTopArtists !== undefined) {
      updateData.showTopArtists = input.showTopArtists;
    }
    if (input.showTopAlbums !== undefined) {
      updateData.showTopAlbums = input.showTopAlbums;
    }
    if (input.showPlaylists !== undefined) {
      updateData.showPlaylists = input.showPlaylists;
    }
    if (input.bio !== undefined) {
      updateData.bio = input.bio;
    }

    let updatedUser = user;
    if (Object.keys(updateData).length > 0) {
      updatedUser = await this.userRepository.updatePartial(input.userId, updateData);
    }

    return {
      isPublicProfile: updatedUser.isPublicProfile,
      showTopTracks: updatedUser.showTopTracks,
      showTopArtists: updatedUser.showTopArtists,
      showTopAlbums: updatedUser.showTopAlbums,
      showPlaylists: updatedUser.showPlaylists,
      bio: updatedUser.bio,
    };
  }
}
