import { ScannerMapper } from './scanner.mapper';
import { LibraryScan } from '../../domain/entities/library-scan.entity';

describe('ScannerMapper', () => {
  describe('toDomain', () => {
    it('should convert DB record to domain entity', () => {
      const dbRecord = {
        id: 'scan-123',
        status: 'completed',
        startedAt: new Date('2024-01-15T10:00:00Z'),
        finishedAt: new Date('2024-01-15T10:30:00Z'),
        tracksAdded: 100,
        tracksUpdated: 50,
        tracksDeleted: 10,
        errorMessage: null,
      };

      const result = ScannerMapper.toDomain(dbRecord as any);

      expect(result).toBeInstanceOf(LibraryScan);
      expect(result.id).toBe('scan-123');
      expect(result.status).toBe('completed');
      expect(result.tracksAdded).toBe(100);
    });

    it('should handle null finishedAt', () => {
      const dbRecord = {
        id: 'scan-456',
        status: 'running',
        startedAt: new Date('2024-01-15T10:00:00Z'),
        finishedAt: null,
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
        errorMessage: null,
      };

      const result = ScannerMapper.toDomain(dbRecord as any);

      expect(result.finishedAt).toBeUndefined();
    });

    it('should handle null errorMessage', () => {
      const dbRecord = {
        id: 'scan-789',
        status: 'completed',
        startedAt: new Date(),
        finishedAt: new Date(),
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
        errorMessage: null,
      };

      const result = ScannerMapper.toDomain(dbRecord as any);

      expect(result.errorMessage).toBeUndefined();
    });

    it('should preserve error message when present', () => {
      const dbRecord = {
        id: 'scan-failed',
        status: 'failed',
        startedAt: new Date(),
        finishedAt: new Date(),
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
        errorMessage: 'Disk space exceeded',
      };

      const result = ScannerMapper.toDomain(dbRecord as any);

      expect(result.errorMessage).toBe('Disk space exceeded');
    });

    it('should handle all scan statuses', () => {
      const statuses = ['pending', 'running', 'completed', 'failed'];

      statuses.forEach((status) => {
        const dbRecord = {
          id: `scan-${status}`,
          status,
          startedAt: new Date(),
          finishedAt: null,
          tracksAdded: 0,
          tracksUpdated: 0,
          tracksDeleted: 0,
          errorMessage: null,
        };

        const result = ScannerMapper.toDomain(dbRecord as any);
        expect(result.status).toBe(status);
      });
    });
  });

  describe('toDomainArray', () => {
    it('should convert array of DB records to domain entities', () => {
      const dbRecords = [
        {
          id: 'scan-1',
          status: 'completed',
          startedAt: new Date(),
          finishedAt: new Date(),
          tracksAdded: 10,
          tracksUpdated: 5,
          tracksDeleted: 2,
          errorMessage: null,
        },
        {
          id: 'scan-2',
          status: 'running',
          startedAt: new Date(),
          finishedAt: null,
          tracksAdded: 3,
          tracksUpdated: 0,
          tracksDeleted: 0,
          errorMessage: null,
        },
      ];

      const result = ScannerMapper.toDomainArray(dbRecords as any);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(LibraryScan);
      expect(result[1]).toBeInstanceOf(LibraryScan);
      expect(result[0].id).toBe('scan-1');
      expect(result[1].id).toBe('scan-2');
    });

    it('should return empty array for empty input', () => {
      const result = ScannerMapper.toDomainArray([]);

      expect(result).toEqual([]);
    });
  });

  describe('toPersistence', () => {
    it('should convert domain entity to DB record', () => {
      const scan = LibraryScan.fromPrimitives({
        id: 'scan-123',
        status: 'completed',
        startedAt: new Date('2024-01-15T10:00:00Z'),
        finishedAt: new Date('2024-01-15T10:30:00Z'),
        tracksAdded: 100,
        tracksUpdated: 50,
        tracksDeleted: 10,
        errorMessage: 'Some warning',
      });

      const result = ScannerMapper.toPersistence(scan);

      expect(result.id).toBe('scan-123');
      expect(result.status).toBe('completed');
      expect(result.tracksAdded).toBe(100);
      expect(result.tracksUpdated).toBe(50);
      expect(result.tracksDeleted).toBe(10);
      expect(result.errorMessage).toBe('Some warning');
    });

    it('should convert undefined finishedAt to null', () => {
      const scan = LibraryScan.fromPrimitives({
        id: 'scan-456',
        status: 'running',
        startedAt: new Date(),
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
      });

      const result = ScannerMapper.toPersistence(scan);

      expect(result.finishedAt).toBeNull();
    });

    it('should convert undefined errorMessage to null', () => {
      const scan = LibraryScan.fromPrimitives({
        id: 'scan-789',
        status: 'pending',
        startedAt: new Date(),
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
      });

      const result = ScannerMapper.toPersistence(scan);

      expect(result.errorMessage).toBeNull();
    });

    it('should preserve all numeric values', () => {
      const scan = LibraryScan.fromPrimitives({
        id: 'scan-big',
        status: 'completed',
        startedAt: new Date(),
        finishedAt: new Date(),
        tracksAdded: 10000,
        tracksUpdated: 5000,
        tracksDeleted: 1000,
      });

      const result = ScannerMapper.toPersistence(scan);

      expect(result.tracksAdded).toBe(10000);
      expect(result.tracksUpdated).toBe(5000);
      expect(result.tracksDeleted).toBe(1000);
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain data integrity through round-trip', () => {
      const originalProps = {
        id: 'round-trip-test',
        status: 'completed' as const,
        startedAt: new Date('2024-01-15T10:00:00Z'),
        finishedAt: new Date('2024-01-15T10:30:00Z'),
        tracksAdded: 150,
        tracksUpdated: 75,
        tracksDeleted: 25,
        errorMessage: 'Test message',
      };

      const domain = LibraryScan.fromPrimitives(originalProps);
      const persistence = ScannerMapper.toPersistence(domain);

      // Simulate DB returning null for error message -> string
      const dbResult = {
        ...persistence,
        finishedAt: persistence.finishedAt,
        errorMessage: persistence.errorMessage,
      };

      const reconstructed = ScannerMapper.toDomain(dbResult as any);

      expect(reconstructed.id).toBe(originalProps.id);
      expect(reconstructed.status).toBe(originalProps.status);
      expect(reconstructed.tracksAdded).toBe(originalProps.tracksAdded);
      expect(reconstructed.tracksUpdated).toBe(originalProps.tracksUpdated);
      expect(reconstructed.tracksDeleted).toBe(originalProps.tracksDeleted);
      expect(reconstructed.errorMessage).toBe(originalProps.errorMessage);
    });

    it('should handle round-trip with null optional fields', () => {
      const originalProps = {
        id: 'round-trip-null',
        status: 'running' as const,
        startedAt: new Date('2024-01-15T10:00:00Z'),
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
      };

      const domain = LibraryScan.fromPrimitives(originalProps);
      const persistence = ScannerMapper.toPersistence(domain);
      const reconstructed = ScannerMapper.toDomain(persistence as any);

      expect(reconstructed.finishedAt).toBeUndefined();
      expect(reconstructed.errorMessage).toBeUndefined();
    });
  });
});
