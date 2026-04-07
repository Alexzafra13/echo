/**
 * Setting Entity - Domain representation of an application setting
 */
export interface Setting {
  key: string;
  value: string;
  category: string;
  type: string;
  description: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data for creating a new setting
 */
export interface CreateSettingData {
  key: string;
  value: string;
  category: string;
  type?: string;
  description?: string;
  isPublic?: boolean;
}
