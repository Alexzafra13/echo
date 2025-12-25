import { HomeSectionConfig } from '@shared/types/home-section.types';

export interface UpdateHomePreferencesInput {
  userId: string;
  /** New home sections configuration. If not provided, returns current settings */
  homeSections?: HomeSectionConfig[];
}

export interface UpdateHomePreferencesOutput {
  homeSections: HomeSectionConfig[];
}
