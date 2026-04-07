import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '@features/auth/domain/ports';
import { NotFoundError, ValidationError } from '@shared/errors';
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
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    // Si no se envían secciones, retorna la config actual (migra secciones faltantes)
    if (!input.homeSections) {
      const sections = this.ensureAllSections(user.homeSections || []);
      return {
        homeSections: sections,
      };
    }

    this.validateSections(input.homeSections);

    const updatedUser = await this.userRepository.updatePartial(input.userId, {
      homeSections: input.homeSections,
    });

    return {
      homeSections: updatedUser.homeSections || this.getDefaultSections(),
    };
  }

  private validateSections(sections: HomeSectionConfig[]): void {
    const providedIds = sections.map(s => s.id);
    const invalidIds = providedIds.filter(id => !VALID_HOME_SECTION_IDS.includes(id));

    if (invalidIds.length > 0) {
      throw new ValidationError(`Invalid section IDs: ${invalidIds.join(', ')}`);
    }

    const uniqueIds = new Set(providedIds);
    if (uniqueIds.size !== providedIds.length) {
      throw new ValidationError('Duplicate section IDs are not allowed');
    }

    if (sections.length !== VALID_HOME_SECTION_IDS.length) {
      throw new ValidationError(`All ${VALID_HOME_SECTION_IDS.length} sections must be provided`);
    }

    const orders = sections.map(s => s.order).sort((a, b) => a - b);
    const expectedOrders = Array.from({ length: sections.length }, (_, i) => i);
    if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
      throw new ValidationError('Section orders must be sequential starting from 0');
    }
  }

  private getDefaultSections(): HomeSectionConfig[] {
    return [...DEFAULT_HOME_SECTIONS];
  }

  // Normaliza secciones: filtra inválidas, elimina duplicados, agrega faltantes
  private ensureAllSections(sections: HomeSectionConfig[]): HomeSectionConfig[] {
    const seenIds = new Set<HomeSectionConfig['id']>();
    const validSections: HomeSectionConfig[] = [];

    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

    for (const section of sortedSections) {
      if (VALID_HOME_SECTION_IDS.includes(section.id) && !seenIds.has(section.id)) {
        seenIds.add(section.id);
        validSections.push(section);
      }
    }

    for (const id of VALID_HOME_SECTION_IDS) {
      if (!seenIds.has(id)) {
        validSections.push({ id, enabled: false, order: validSections.length });
      }
    }

    return validSections.map((section, index) => ({
      ...section,
      order: index,
    }));
  }
}
