import { Test, TestingModule } from '@nestjs/testing';
import { StartScanUseCase, SCAN_PROCESSOR } from './start-scan.use-case';
import { SCANNER_REPOSITORY, IScannerRepository } from '../../ports/scanner-repository.port';
import { LibraryScan } from '../../entities/library-scan.entity';

describe('StartScanUseCase', () => {
  let useCase: StartScanUseCase;
  let scannerRepository: jest.Mocked<IScannerRepository>;
  let scanProcessor: jest.Mocked<any>;

  beforeEach(async () => {
    // Mock del repository
    scannerRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findLatest: jest.fn(),
      findByStatus: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };

    // Mock del processor
    scanProcessor = {
      enqueueScan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartScanUseCase,
        {
          provide: SCANNER_REPOSITORY,
          useValue: scannerRepository,
        },
        {
          provide: SCAN_PROCESSOR,
          useValue: scanProcessor,
        },
      ],
    }).compile();

    useCase = module.get<StartScanUseCase>(StartScanUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should create a scan and enqueue it successfully', async () => {
      // Arrange
      const mockScan = LibraryScan.create({
        status: 'pending',
        startedAt: new Date(),
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
      });

      scannerRepository.findByStatus.mockResolvedValue([]); // No hay escaneos running
      scannerRepository.create.mockResolvedValue(mockScan);
      scanProcessor.enqueueScan.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({
        path: '/music',
        recursive: true,
        pruneDeleted: true,
      });

      // Assert
      expect(scannerRepository.findByStatus).toHaveBeenCalledWith('running');
      expect(scannerRepository.create).toHaveBeenCalled();
      expect(scanProcessor.enqueueScan).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: mockScan.id,
        status: 'pending',
        message: expect.stringContaining('segundo plano'),
      });
    });

    it('should throw error if there is already a running scan', async () => {
      // Arrange
      const runningScan = LibraryScan.create({
        status: 'running',
        startedAt: new Date(),
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
      });

      scannerRepository.findByStatus.mockResolvedValue([runningScan]);

      // Act & Assert
      await expect(useCase.execute({})).rejects.toThrow(
        'Ya hay un escaneo en progreso',
      );

      expect(scannerRepository.findByStatus).toHaveBeenCalledWith('running');
      expect(scannerRepository.create).not.toHaveBeenCalled();
      expect(scanProcessor.enqueueScan).not.toHaveBeenCalled();
    });

    it('should use default options when none provided', async () => {
      // Arrange
      const mockScan = LibraryScan.create({
        status: 'pending',
        startedAt: new Date(),
        tracksAdded: 0,
        tracksUpdated: 0,
        tracksDeleted: 0,
      });

      scannerRepository.findByStatus.mockResolvedValue([]);
      scannerRepository.create.mockResolvedValue(mockScan);
      scanProcessor.enqueueScan.mockResolvedValue(undefined);

      // Act
      await useCase.execute({});

      // Assert
      expect(scanProcessor.enqueueScan).toHaveBeenCalledWith(
        mockScan.id,
        expect.objectContaining({
          path: undefined,
          recursive: undefined,
          pruneDeleted: undefined,
        }),
      );
    });
  });
});
