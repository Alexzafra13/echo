import { DjAnalysisMapper } from './dj-analysis.mapper';
import { DjAnalysis } from '../../domain/entities/dj-analysis.entity';

// Minimal type matching the DB schema for tests
interface DjAnalysisDb {
  id: string;
  trackId: string;
  bpm: number | null;
  key: string | null;
  camelotKey: string | null;
  energy: number | null;
  danceability: number | null;
  status: string;
  analysisError: string | null;
  analyzedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

describe('DjAnalysisMapper', () => {
  const now = new Date('2025-01-01T00:00:00Z');

  const fullDbRecord: DjAnalysisDb = {
    id: 'analysis-id-1',
    trackId: 'track-123',
    bpm: 128,
    key: 'Am',
    camelotKey: '8A',
    energy: 0.75,
    danceability: 0.65,
    status: 'completed',
    analysisError: null,
    analyzedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const nullableDbRecord: DjAnalysisDb = {
    id: 'analysis-id-2',
    trackId: 'track-456',
    bpm: null,
    key: null,
    camelotKey: null,
    energy: null,
    danceability: null,
    status: 'pending',
    analysisError: null,
    analyzedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  // ─── toDomain ──────────────────────────────────────────────────────

  describe('toDomain', () => {
    it('should map a complete DB record to domain entity', () => {
      const entity = DjAnalysisMapper.toDomain(fullDbRecord as any);

      expect(entity.id).toBe('analysis-id-1');
      expect(entity.trackId).toBe('track-123');
      expect(entity.bpm).toBe(128);
      expect(entity.key).toBe('Am');
      expect(entity.camelotKey).toBe('8A');
      expect(entity.energy).toBe(0.75);
      expect(entity.danceability).toBe(0.65);
      expect(entity.status).toBe('completed');
      expect(entity.analyzedAt).toEqual(now);
    });

    it('should map null DB fields to undefined domain fields', () => {
      const entity = DjAnalysisMapper.toDomain(nullableDbRecord as any);

      expect(entity.bpm).toBeUndefined();
      expect(entity.key).toBeUndefined();
      expect(entity.camelotKey).toBeUndefined();
      expect(entity.energy).toBeUndefined();
      expect(entity.danceability).toBeUndefined();
      expect(entity.analysisError).toBeUndefined();
      expect(entity.analyzedAt).toBeUndefined();
    });

    it('should default invalid status to pending', () => {
      const invalidStatusRecord = { ...fullDbRecord, status: 'garbage' };
      const spy = jest.spyOn(console, 'warn').mockImplementation();

      const entity = DjAnalysisMapper.toDomain(invalidStatusRecord as any);
      expect(entity.status).toBe('pending');

      spy.mockRestore();
    });

    it('should preserve valid statuses', () => {
      for (const status of ['pending', 'analyzing', 'completed', 'failed']) {
        const record = { ...fullDbRecord, status };
        const entity = DjAnalysisMapper.toDomain(record as any);
        expect(entity.status).toBe(status);
      }
    });
  });

  // ─── toDomainArray ─────────────────────────────────────────────────

  describe('toDomainArray', () => {
    it('should map an array of DB records', () => {
      const entities = DjAnalysisMapper.toDomainArray([fullDbRecord, nullableDbRecord] as any[]);
      expect(entities).toHaveLength(2);
      expect(entities[0].id).toBe('analysis-id-1');
      expect(entities[1].id).toBe('analysis-id-2');
    });

    it('should return empty array for empty input', () => {
      expect(DjAnalysisMapper.toDomainArray([])).toEqual([]);
    });
  });

  // ─── toPersistence ─────────────────────────────────────────────────

  describe('toPersistence', () => {
    it('should map domain entity to DB format', () => {
      const entity = DjAnalysis.fromPrimitives({
        id: 'test-id',
        trackId: 'track-789',
        bpm: 140,
        key: 'Cm',
        camelotKey: '5A',
        energy: 0.9,
        danceability: 0.8,
        status: 'completed',
        analyzedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      const db = DjAnalysisMapper.toPersistence(entity);

      expect(db.id).toBe('test-id');
      expect(db.trackId).toBe('track-789');
      expect(db.bpm).toBe(140);
      expect(db.key).toBe('Cm');
      expect(db.camelotKey).toBe('5A');
      expect(db.energy).toBe(0.9);
      expect(db.danceability).toBe(0.8);
      expect(db.status).toBe('completed');
    });

    it('should convert undefined domain fields to null for DB', () => {
      const entity = DjAnalysis.fromPrimitives({
        id: 'test-id',
        trackId: 'track-789',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });

      const db = DjAnalysisMapper.toPersistence(entity);

      expect(db.bpm).toBeNull();
      expect(db.key).toBeNull();
      expect(db.camelotKey).toBeNull();
      expect(db.energy).toBeNull();
      expect(db.danceability).toBeNull();
      expect(db.analysisError).toBeNull();
      expect(db.analyzedAt).toBeNull();
    });
  });

  // ─── Round-trip ────────────────────────────────────────────────────

  describe('round-trip', () => {
    it('should preserve data through toDomain → toPersistence cycle', () => {
      const entity = DjAnalysisMapper.toDomain(fullDbRecord as any);
      const backToDb = DjAnalysisMapper.toPersistence(entity);

      expect(backToDb.id).toBe(fullDbRecord.id);
      expect(backToDb.trackId).toBe(fullDbRecord.trackId);
      expect(backToDb.bpm).toBe(fullDbRecord.bpm);
      expect(backToDb.key).toBe(fullDbRecord.key);
      expect(backToDb.camelotKey).toBe(fullDbRecord.camelotKey);
      expect(backToDb.energy).toBe(fullDbRecord.energy);
      expect(backToDb.danceability).toBe(fullDbRecord.danceability);
      expect(backToDb.status).toBe(fullDbRecord.status);
    });
  });
});
