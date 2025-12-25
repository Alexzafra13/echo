import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { NotFoundError } from '@shared/errors';
import {
  HomeSectionConfig,
  VALID_HOME_SECTION_IDS,
  DEFAULT_HOME_SECTIONS,
} from '@shared/types/home-section.types';
import { UpdateHomePreferencesInput, UpdateHomePreferencesOutput } from './update-home-preferences.dto';

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
    const invalidIds = providedIds.filter(id => !VALID_HOME_SECTION_IDS.includes(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(`Invalid section IDs: ${invalidIds.join(', ')}`);
    }

    // Check for duplicate section IDs
    const uniqueIds = new Set(providedIds);
    if (uniqueIds.size !== providedIds.length) {
      throw new BadRequestException('Duplicate section IDs are not allowed');
    }

    // Check that all 9 sections are present
    if (sections.length !== VALID_HOME_SECTION_IDS.length) {
      throw new BadRequestException(`All ${VALID_HOME_SECTION_IDS.length} sections must be provided`);
    }

    // Check orders are valid (0 to n-1)
    const orders = sections.map(s => s.order).sort((a, b) => a - b);
    const expectedOrders = Array.from({ length: sections.length }, (_, i) => i);
    if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
      throw new BadRequestException('Section orders must be sequential starting from 0');
    }
  }

  private getDefaultSections(): HomeSectionConfig[] {
    return [...DEFAULT_HOME_SECTIONS];
  }

  /**
   * Normalize and ensure all valid sections are present (migration helper for existing users)
   * - Filters out invalid section IDs
   * - Removes duplicates (keeps first occurrence)
   * - Adds missing sections with enabled: false
   * - Re-numbers orders sequentially (0 to n-1)
   */
  private ensureAllSections(sections: HomeSectionConfig[]): HomeSectionConfig[] {
    // 1. Filter to only valid IDs and remove duplicates (keep first occurrence)
    const seenIds = new Set<HomeSectionConfig['id']>();
    const validSections: HomeSectionConfig[] = [];

    // Sort by order first to preserve user's ordering preference
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

    for (const section of sortedSections) {
      if (VALID_HOME_SECTION_IDS.includes(section.id) && !seenIds.has(section.id)) {
        seenIds.add(section.id);
        validSections.push(section);
      }
    }

    // 2. Add missing sections
    for (const id of VALID_HOME_SECTION_IDS) {
      if (!seenIds.has(id)) {
        validSections.push({ id, enabled: false, order: validSections.length });
      }
    }

    // 3. Re-number orders sequentially (0 to n-1)
    return validSections.map((section, index) => ({
      ...section,
      order: index,
    }));
  }
}
