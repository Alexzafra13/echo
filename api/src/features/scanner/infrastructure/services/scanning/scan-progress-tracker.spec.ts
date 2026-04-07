import { ScanProgressTracker } from './track-processing.service';

describe('ScanProgressTracker', () => {
  let tracker: ScanProgressTracker;

  beforeEach(() => {
    tracker = new ScanProgressTracker();
  });

  it('should initialize all counters to zero', () => {
    expect(tracker.filesScanned).toBe(0);
    expect(tracker.totalFiles).toBe(0);
    expect(tracker.tracksCreated).toBe(0);
    expect(tracker.tracksSkipped).toBe(0);
    expect(tracker.albumsCreated).toBe(0);
    expect(tracker.artistsCreated).toBe(0);
    expect(tracker.coversExtracted).toBe(0);
    expect(tracker.videosFound).toBe(0);
    expect(tracker.errors).toBe(0);
  });

  describe('progress', () => {
    it('should return 0 when totalFiles is 0 (no division by zero)', () => {
      expect(tracker.progress).toBe(0);
    });

    it('should calculate correct percentage', () => {
      tracker.totalFiles = 100;
      tracker.filesScanned = 50;

      expect(tracker.progress).toBe(50);
    });

    it('should return 100 when all files scanned', () => {
      tracker.totalFiles = 200;
      tracker.filesScanned = 200;

      expect(tracker.progress).toBe(100);
    });

    it('should round to integer', () => {
      tracker.totalFiles = 3;
      tracker.filesScanned = 1;

      // 1/3 * 100 = 33.33... → 33
      expect(tracker.progress).toBe(33);
    });

    it('should handle single file', () => {
      tracker.totalFiles = 1;
      tracker.filesScanned = 1;

      expect(tracker.progress).toBe(100);
    });
  });

  it('should track counters independently', () => {
    tracker.tracksCreated = 10;
    tracker.albumsCreated = 3;
    tracker.artistsCreated = 2;
    tracker.coversExtracted = 3;
    tracker.errors = 1;

    expect(tracker.tracksCreated).toBe(10);
    expect(tracker.albumsCreated).toBe(3);
    expect(tracker.artistsCreated).toBe(2);
    expect(tracker.coversExtracted).toBe(3);
    expect(tracker.errors).toBe(1);
  });
});
