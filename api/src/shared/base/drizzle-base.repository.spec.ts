import { DrizzleBaseRepository, EntityMapper } from './drizzle-base.repository';
import { DrizzleService } from '@infrastructure/database/drizzle.service';

// Test entity types
interface TestDomain {
  id: string;
  name: string;
  active: boolean;
  toPrimitives?: () => TestPersistence;
}

interface TestPersistence {
  id: string;
  name: string;
  active: boolean;
}

// Mock table with id column
const mockTable = {
  id: { name: 'id' },
  name: { name: 'name' },
  active: { name: 'active' },
} as unknown as Record<string, { name: string }>;

// Test mapper
const testMapper: EntityMapper<TestDomain, TestPersistence> = {
  toDomain: (raw: TestPersistence): TestDomain => ({
    id: raw.id,
    name: raw.name,
    active: raw.active,
  }),
  toDomainArray: (raw: TestPersistence[]): TestDomain[] => raw.map(testMapper.toDomain),
};

// Concrete implementation for testing
class TestRepository extends DrizzleBaseRepository<TestDomain, TestPersistence> {
  protected readonly table = mockTable;
  protected readonly mapper = testMapper;

  constructor(protected readonly drizzle: DrizzleService) {
    super();
  }

  // Expose protected methods for testing
  public testToPrimitives(entity: Partial<TestDomain>) {
    return this.toPrimitives(entity);
  }

  public testBuildUpdateData<T extends Record<string, unknown>>(
    primitives: T,
    fields: (keyof T)[]
  ) {
    return this.buildUpdateData(primitives, fields);
  }
}

describe('DrizzleBaseRepository', () => {
  let repository: TestRepository;
  let mockDrizzle: jest.Mocked<DrizzleService>;
  let mockDb: { delete: jest.Mock; where: jest.Mock; returning: jest.Mock };

  beforeEach(() => {
    // Setup mock chain for drizzle operations
    mockDb = {
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn(),
    };

    mockDrizzle = {
      db: mockDb,
    } as unknown as jest.Mocked<DrizzleService>;

    repository = new TestRepository(mockDrizzle);
  });

  describe('delete', () => {
    it('should delete entity and return true on success', async () => {
      mockDb.returning.mockResolvedValue([{ id: 'test-id' }]);

      const result = await repository.delete('test-id');

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalledWith(mockTable);
    });

    it('should return false when no entity found', async () => {
      mockDb.returning.mockResolvedValue([]);

      const result = await repository.delete('nonexistent-id');

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      mockDb.returning.mockRejectedValue(new Error('Database error'));

      const result = await repository.delete('test-id');

      expect(result).toBe(false);
    });
  });

  describe('toPrimitives', () => {
    it('should call toPrimitives method if entity has it', () => {
      const mockPrimitives = { id: '1', name: 'Test', active: true };
      const entity: TestDomain = {
        id: '1',
        name: 'Test',
        active: true,
        toPrimitives: jest.fn().mockReturnValue(mockPrimitives),
      };

      const result = repository.testToPrimitives(entity);

      expect(entity.toPrimitives).toHaveBeenCalled();
      expect(result).toEqual(mockPrimitives);
    });

    it('should return entity as-is if no toPrimitives method', () => {
      const entity: Partial<TestDomain> = {
        id: '1',
        name: 'Test',
        active: true,
      };

      const result = repository.testToPrimitives(entity);

      expect(result).toEqual(entity);
    });

    it('should handle partial entities', () => {
      const entity: Partial<TestDomain> = {
        name: 'Updated Name',
      };

      const result = repository.testToPrimitives(entity);

      expect(result).toEqual({ name: 'Updated Name' });
    });
  });

  describe('buildUpdateData', () => {
    it('should include only specified fields with defined values', () => {
      const primitives = {
        name: 'New Name',
        active: true,
        description: undefined,
        count: 0,
      };

      const result = repository.testBuildUpdateData(primitives, [
        'name',
        'active',
        'description',
        'count',
      ]);

      expect(result).toEqual({
        name: 'New Name',
        active: true,
        count: 0, // 0 is defined, should be included
      });
      expect(result).not.toHaveProperty('description');
    });

    it('should return empty object when all fields are undefined', () => {
      const primitives = {
        name: undefined,
        active: undefined,
      };

      const result = repository.testBuildUpdateData(primitives, ['name', 'active']);

      expect(result).toEqual({});
    });

    it('should only include requested fields', () => {
      const primitives = {
        name: 'Name',
        active: true,
        secret: 'should not include',
      };

      const result = repository.testBuildUpdateData(primitives, ['name', 'active']);

      expect(result).toEqual({
        name: 'Name',
        active: true,
      });
      expect(result).not.toHaveProperty('secret');
    });

    it('should handle null values as defined', () => {
      const primitives = {
        name: null,
        active: true,
      };

      const result = repository.testBuildUpdateData(primitives, ['name', 'active']);

      expect(result).toEqual({
        name: null,
        active: true,
      });
    });

    it('should handle empty string as defined', () => {
      const primitives = {
        name: '',
        description: 'test',
      };

      const result = repository.testBuildUpdateData(primitives, ['name', 'description']);

      expect(result).toEqual({
        name: '',
        description: 'test',
      });
    });

    it('should handle boolean false as defined', () => {
      const primitives = {
        active: false,
        visible: true,
      };

      const result = repository.testBuildUpdateData(primitives, ['active', 'visible']);

      expect(result).toEqual({
        active: false,
        visible: true,
      });
    });
  });

  describe('EntityMapper interface', () => {
    it('should correctly map single entity', () => {
      const raw: TestPersistence = { id: '1', name: 'Test', active: true };

      const result = testMapper.toDomain(raw);

      expect(result).toEqual({ id: '1', name: 'Test', active: true });
    });

    it('should correctly map array of entities', () => {
      const raw: TestPersistence[] = [
        { id: '1', name: 'Test 1', active: true },
        { id: '2', name: 'Test 2', active: false },
      ];

      const result = testMapper.toDomainArray(raw);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: '1', name: 'Test 1', active: true });
      expect(result[1]).toEqual({ id: '2', name: 'Test 2', active: false });
    });

    it('should handle empty array', () => {
      const result = testMapper.toDomainArray([]);

      expect(result).toEqual([]);
    });
  });
});
