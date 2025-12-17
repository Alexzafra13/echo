import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { NotFoundError } from '@shared/errors';
import { HomeSectionConfig } from '@infrastructure/database/schema/users';
import { UpdateHomePreferencesInput, UpdateHomePreferencesOutput } from './update-home-preferences.dto';

// Valid section IDs
const VALID_SECTION_IDS: HomeSectionConfig['id'][] = [
  'recent-albums',
  'artist-mix',
  'genre-mix',
  'recently-played',
  'my-playlists',
  'top-played',
  'favorite-radios',
  'surprise-me',
  'shared-albums',
];

@Injectable()
export class UpdateHomePreferencesUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: UpdateHomePreferencesInput): Promise<UpdateHomePreferencesOutput> {
    // 1. Verify user exists
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    // 2. If no homeSections provided, return current settings (with migration for missing sections)
    if (!input.homeSections) {
      const sections = this.ensureAllSections(user.homeSections || []);
      return {
        homeSections: sections,
      };
    }

    // 3. Validate the sections
    this.validateSections(input.homeSections);

    // 4. Update user
    const updatedUser = await this.userRepository.updatePartial(input.userId, {
      homeSections: input.homeSections,
    });

    return {
      homeSections: updatedUser.homeSections || this.getDefaultSections(),
    };
  }

  private validateSections(sections: HomeSectionConfig[]): void {
    // Check that all provided section IDs are valid
    const providedIds = sections.map(s => s.id);
    const invalidIds = providedIds.filter(id => !VALID_SECTION_IDS.includes(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(`Invalid section IDs: ${invalidIds.join(', ')}`);
    }

    // Check for duplicate section IDs
    const uniqueIds = new Set(providedIds);
    if (uniqueIds.size !== providedIds.length) {
      throw new BadRequestException('Duplicate section IDs are not allowed');
    }

    // Check that all 8 sections are present
    if (sections.length !== VALID_SECTION_IDS.length) {
      throw new BadRequestException(`All ${VALID_SECTION_IDS.length} sections must be provided`);
    }

    // Check orders are valid (0 to n-1)
    const orders = sections.map(s => s.order).sort((a, b) => a - b);
    const expectedOrders = Array.from({ length: sections.length }, (_, i) => i);
    if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
      throw new BadRequestException('Section orders must be sequential starting from 0');
    }
  }

  private getDefaultSections(): HomeSectionConfig[] {
    return [
      { id: 'recent-albums', enabled: true, order: 0 },
      { id: 'artist-mix', enabled: true, order: 1 },
      { id: 'genre-mix', enabled: false, order: 2 },
      { id: 'recently-played', enabled: false, order: 3 },
      { id: 'my-playlists', enabled: false, order: 4 },
      { id: 'top-played', enabled: false, order: 5 },
      { id: 'favorite-radios', enabled: false, order: 6 },
      { id: 'surprise-me', enabled: false, order: 7 },
      { id: 'shared-albums', enabled: false, order: 8 },
    ];
  }

  /**
   * Ensure all valid sections are present (migration helper for existing users)
   * Adds any missing sections at the end with enabled: false
   */
  private ensureAllSections(sections: HomeSectionConfig[]): HomeSectionConfig[] {
    const existingIds = new Set(sections.map(s => s.id));
    const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order)) : -1;

    let nextOrder = maxOrder + 1;
    const missingSections: HomeSectionConfig[] = [];

    for (const id of VALID_SECTION_IDS) {
      if (!existingIds.has(id)) {
        missingSections.push({ id, enabled: false, order: nextOrder++ });
      }
    }

    return [...sections, ...missingSections];
  }
}
