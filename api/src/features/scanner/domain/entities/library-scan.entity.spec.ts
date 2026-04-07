import { LibraryScan } from './library-scan.entity';

describe('LibraryScan Entity', () => {
  describe('create', () => {
    it('should create a new LibraryScan with auto-generated id', () => {
      // Act
      const scan = LibraryScan.create({
        status: 'pending',
        startedAt: new Date(),
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
      });

      // Assert
      expect(scan).toBeDefined();
      expect(scan.id).toBeDefined();
      expect(scan.status).toBe('pending');
      expect(scan.tracksAdded).toBe(0);
    });
  });

  describe('fromPrimitives', () => {
    it('should reconstruct LibraryScan from primitives', () => {
      // Arrange
      const primitives = {
        id: 'scan-123',
        status: 'completed' as const,
        startedAt: new Date(),
        finishedAt: new Date(),
        tracksAdded: 10,
        tracksUpdated: 5,
        tracksDeleted: 2,
        errorMessage: undefined,
      };

      // Act
      const scan = LibraryScan.fromPrimitives(primitives);

      // Assert
      expect(scan.id).toBe('scan-123');
      expect(scan.status).toBe('completed');
      expect(scan.tracksAdded).toBe(10);
    });
  });

  describe('status methods', () => {
    it('should correctly identify pending scan', () => {
      const scan = LibraryScan.create({
        status: 'pending',
        startedAt: new Date(),
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
      });

      expect(scan.isPending()).toBe(true);
      expect(scan.isRunning()).toBe(false);
      expect(scan.isCompleted()).toBe(false);
      expect(scan.isFailed()).toBe(false);
    });

    it('should correctly identify running scan', () => {
      const scan = LibraryScan.fromPrimitives({
        id: 'scan-1',
        status: 'running',
        startedAt: new Date(),
        tracksAdded: 5,
        tracksUpdated: 0,
        tracksDeleted: 0,
      });

      expect(scan.isRunning()).toBe(true);
      expect(scan.isPending()).toBe(false);
    });

    it('should correctly identify completed scan', () => {
      const scan = LibraryScan.fromPrimitives({
        id: 'scan-1',
        status: 'completed',
        startedAt: new Date(),
        finishedAt: new Date(),
        tracksAdded: 10,
        tracksUpdated: 5,
        tracksDeleted: 2,
      });

      expect(scan.isCompleted()).toBe(true);
      expect(scan.isRunning()).toBe(false);
    });

    it('should correctly identify failed scan', () => {
      const scan = LibraryScan.fromPrimitives({
        id: 'scan-1',
        status: 'failed',
        startedAt: new Date(),
        finishedAt: new Date(),
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
        errorMessage: 'Something went wrong',
      });

      expect(scan.isFailed()).toBe(true);
      expect(scan.errorMessage).toBe('Something went wrong');
    });
  });

  describe('getTotalChanges', () => {
    it('should calculate total changes correctly', () => {
      const scan = LibraryScan.fromPrimitives({
        id: 'scan-1',
        status: 'completed',
        startedAt: new Date(),
        finishedAt: new Date(),
        tracksAdded: 10,
        tracksUpdated: 5,
        tracksDeleted: 3,
      });

      expect(scan.getTotalChanges()).toBe(18); // 10 + 5 + 3
    });

    it('should return 0 for scan with no changes', () => {
      const scan = LibraryScan.create({
        status: 'pending',
        startedAt: new Date(),
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
      });

      expect(scan.getTotalChanges()).toBe(0);
    });
  });

  describe('getDuration', () => {
    it('should return null if scan is not finished', () => {
      const scan = LibraryScan.create({
        status: 'running',
        startedAt: new Date(),
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
      });

      expect(scan.getDuration()).toBeNull();
    });

    it('should calculate duration correctly for finished scan', () => {
      const startedAt = new Date('2024-01-01T10:00:00');
      const finishedAt = new Date('2024-01-01T10:05:30'); // 5 minutes 30 seconds

      const scan = LibraryScan.fromPrimitives({
        id: 'scan-1',
        status: 'completed',
        startedAt,
        finishedAt,
        tracksAdded: 10,
        tracksUpdated: 0,
        tracksDeleted: 0,
      });

      expect(scan.getDuration()).toBe(5 * 60 * 1000 + 30 * 1000); // 330000 ms
    });
  });

  describe('toPrimitives', () => {
    it('should convert entity to primitives', () => {
      const startedAt = new Date();
      const scan = LibraryScan.create({
        status: 'pending',
        startedAt,
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
      });

      const primitives = scan.toPrimitives();

      expect(primitives).toMatchObject({
        id: scan.id,
        status: 'pending',
        startedAt,
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
      });
    });
  });
});
