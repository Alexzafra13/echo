import { DjStems, StemStatus } from '../entities/dj-stems.entity';

export interface IDjStemsRepository {
  /**
   * Create a new stems record
   */
  create(stems: DjStems): Promise<DjStems>;

  /**
   * Find stems by ID
   */
  findById(id: string): Promise<DjStems | null>;

  /**
   * Find stems by track ID
   */
  findByTrackId(trackId: string): Promise<DjStems | null>;

  /**
   * Find all stems by status
   */
  findByStatus(status: StemStatus): Promise<DjStems[]>;

  /**
   * Find stems for multiple track IDs
   */
  findByTrackIds(trackIds: string[]): Promise<DjStems[]>;

  /**
   * Update existing stems
   */
  update(stems: DjStems): Promise<DjStems>;

  /**
   * Delete stems by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete stems by track ID
   */
  deleteByTrackId(trackId: string): Promise<boolean>;

  /**
   * Count pending stems
   */
  countPending(): Promise<number>;

  /**
   * Count processed stems
   */
  countProcessed(): Promise<number>;

  /**
   * Get total storage used by stems
   */
  getTotalStorageUsed(): Promise<number>;
}

export const DJ_STEMS_REPOSITORY = 'IDjStemsRepository';
