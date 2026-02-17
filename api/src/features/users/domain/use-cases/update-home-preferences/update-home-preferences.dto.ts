import { HomeSectionConfig } from '@shared/types/home-section.types';

export interface UpdateHomePreferencesInput {
  userId: string;
  homeSections?: HomeSectionConfig[];
}

export interface UpdateHomePreferencesOutput {
  homeSections: HomeSectionConfig[];
}
