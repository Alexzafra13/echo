/**
 * DjStems Entity - Separated audio stems for mashups
 *
 * Represents the separated audio components (vocals, drums, bass, other)
 * of a track for advanced DJ mixing capabilities.
 */

export type StemStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DjStemsProps {
  id: string;
  trackId: string;

  // Stem file paths (relative to stems directory)
  vocalsPath?: string;
  drumsPath?: string;
  bassPath?: string;
  otherPath?: string;

  // Processing info
  status: StemStatus;
  processingError?: string;
  modelUsed?: string; // 'demucs-plugin', 'spleeter', etc.

  // File sizes
  totalSizeBytes?: number;

  // Timestamps
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class DjStems {
  private constructor(private readonly props: DjStemsProps) {}

  static create(props: Omit<DjStemsProps, 'id' | 'createdAt' | 'updatedAt'>): DjStems {
    const now = new Date();
    return new DjStems({
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...props,
    });
  }

  static fromPrimitives(props: DjStemsProps): DjStems {
    return new DjStems(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get trackId(): string {
    return this.props.trackId;
  }

  get vocalsPath(): string | undefined {
    return this.props.vocalsPath;
  }

  get drumsPath(): string | undefined {
    return this.props.drumsPath;
  }

  get bassPath(): string | undefined {
    return this.props.bassPath;
  }

  get otherPath(): string | undefined {
    return this.props.otherPath;
  }

  get status(): StemStatus {
    return this.props.status;
  }

  get processingError(): string | undefined {
    return this.props.processingError;
  }

  get modelUsed(): string | undefined {
    return this.props.modelUsed;
  }

  get totalSizeBytes(): number | undefined {
    return this.props.totalSizeBytes;
  }

  get processedAt(): Date | undefined {
    return this.props.processedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic methods

  isProcessed(): boolean {
    return this.status === 'completed';
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  isProcessing(): boolean {
    return this.status === 'processing';
  }

  isFailed(): boolean {
    return this.status === 'failed';
  }

  hasAllStems(): boolean {
    return !!(this.vocalsPath && this.drumsPath && this.bassPath && this.otherPath);
  }

  getAvailableStems(): string[] {
    const stems: string[] = [];
    if (this.vocalsPath) stems.push('vocals');
    if (this.drumsPath) stems.push('drums');
    if (this.bassPath) stems.push('bass');
    if (this.otherPath) stems.push('other');
    return stems;
  }

  getStemPath(stemType: 'vocals' | 'drums' | 'bass' | 'other'): string | undefined {
    switch (stemType) {
      case 'vocals':
        return this.vocalsPath;
      case 'drums':
        return this.drumsPath;
      case 'bass':
        return this.bassPath;
      case 'other':
        return this.otherPath;
    }
  }

  /**
   * Get total size in human-readable format
   */
  getTotalSizeFormatted(): string {
    if (!this.totalSizeBytes) {
      return 'Unknown';
    }
    const mb = this.totalSizeBytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }

  toPrimitives(): DjStemsProps {
    return {
      id: this.id,
      trackId: this.trackId,
      vocalsPath: this.vocalsPath,
      drumsPath: this.drumsPath,
      bassPath: this.bassPath,
      otherPath: this.otherPath,
      status: this.status,
      processingError: this.processingError,
      modelUsed: this.modelUsed,
      totalSizeBytes: this.totalSizeBytes,
      processedAt: this.processedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
