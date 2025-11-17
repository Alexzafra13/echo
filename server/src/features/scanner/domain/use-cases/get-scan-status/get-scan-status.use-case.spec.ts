import { Test, TestingModule } from '@nestjs/testing';
import { GetScanStatusUseCase } from './get-scan-status.use-case';
import { SCANNER_REPOSITORY, IScannerRepository } from '../../ports/scanner-repository.port';
import { LibraryScan } from '../../entities/library-scan.entity';
import { NotFoundError } from '@shared/errors';

describe('GetScanStatusUseCase', () => {
  let useCase: GetScanStatusUseCase;
  let scannerRepository: jest.Mocked<IScannerRepository>;

  beforeEach(async () => {
    scannerRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findLatest: jest.fn(),
      findByStatus: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetScanStatusUseCase,
        {
          provide: SCANNER_REPOSITORY,
          useValue: scannerRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetScanStatusUseCase>(GetScanStatusUseCase);
  });

  describe('execute', () => {
    it('should return scan status for existing scan', async () => {
      // Arrange
      const mockScan = LibraryScan.fromPrimitives({
        id: 'scan-123',
        status: 'completed',
        startedAt: new Date('2024-01-01T10:00:00'),
        finishedAt: new Date('2024-01-01T10:05:00'),
        tracksAdded: 10,
        tracksUpdated: 5,
        tracksDeleted: 2,
      });

      scannerRepository.findById.mockResolvedValue(mockScan);

      // Act
      const result = await useCase.execute({ id: 'scan-123' });

      // Assert
      expect(scannerRepository.findById).toHaveBeenCalledWith('scan-123');
      expect(result).toMatchObject({
        id: 'scan-123',
        status: 'completed',
        tracksAdded: 10,
        tracksUpdated: 5,
        tracksDeleted: 2,
        totalChanges: 17, // 10 + 5 + 2
      });
      expect(result.durationMs).toBeDefined();
    });

    it('should throw NotFoundError if scan does not exist', async () => {
      // Arrange
      scannerRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute({ id: 'non-existent' })).rejects.toThrow(
        NotFoundError,
      );
      expect(scannerRepository.findById).toHaveBeenCalledWith('non-existent');
    });

    it('should throw NotFoundError for empty/invalid id', async () => {
      // Act & Assert
      await expect(useCase.execute({ id: '' })).rejects.toThrow(NotFoundError);
      await expect(useCase.execute({ id: '   ' })).rejects.toThrow(
        NotFoundError,
      );

      // Should not call repository for invalid ids
      expect(scannerRepository.findById).not.toHaveBeenCalled();
    });

    it('should return scan with null duration if not finished', async () => {
      // Arrange
      const runningScan = LibraryScan.fromPrimitives({
        id: 'scan-456',
        status: 'running',
        startedAt: new Date(),
        tracksAdded: 5,
        tracksUpdated: 0,
        tracksDeleted: 0,
      });

      scannerRepository.findById.mockResolvedValue(runningScan);

      // Act
      const result = await useCase.execute({ id: 'scan-456' });

      // Assert
      expect(result.finishedAt).toBeUndefined();
      expect(result.durationMs).toBeUndefined();
      expect(result.status).toBe('running');
    });
  });
});
