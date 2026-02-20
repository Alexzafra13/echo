import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { ScannerController } from './scanner.controller';
import {
  StartScanUseCase,
  GetScanStatusUseCase,
  GetScansHistoryUseCase,
} from '../../domain/use-cases';
import { LufsAnalysisQueueService } from '../../infrastructure/services/lufs-analysis-queue.service';
import { DjAnalysisQueueService } from '@features/dj/infrastructure/services/dj-analysis-queue.service';
import { LibraryCleanupService } from '../../infrastructure/services/scanning/library-cleanup.service';

describe('ScannerController', () => {
  let controller: ScannerController;
  let startScanUseCase: jest.Mocked<StartScanUseCase>;
  let getScanStatusUseCase: jest.Mocked<GetScanStatusUseCase>;
  let getScansHistoryUseCase: jest.Mocked<GetScansHistoryUseCase>;
  let lufsQueueService: jest.Mocked<LufsAnalysisQueueService>;
  let djAnalysisQueue: jest.Mocked<DjAnalysisQueueService>;
  let libraryCleanup: jest.Mocked<LibraryCleanupService>;

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScannerController],
      providers: [
        { provide: StartScanUseCase, useValue: { execute: jest.fn() } },
        { provide: GetScanStatusUseCase, useValue: { execute: jest.fn() } },
        { provide: GetScansHistoryUseCase, useValue: { execute: jest.fn() } },
        {
          provide: LufsAnalysisQueueService,
          useValue: { getQueueStats: jest.fn() },
        },
        {
          provide: DjAnalysisQueueService,
          useValue: { getQueueStats: jest.fn() },
        },
        {
          provide: LibraryCleanupService,
          useValue: {
            getMissingTracks: jest.fn(),
            getPurgeMode: jest.fn(),
            purgeOldMissingTracks: jest.fn(),
            deleteMissingTrackById: jest.fn(),
          },
        },
        { provide: getLoggerToken(ScannerController.name), useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<ScannerController>(ScannerController);
    startScanUseCase = module.get(StartScanUseCase);
    getScanStatusUseCase = module.get(GetScanStatusUseCase);
    getScansHistoryUseCase = module.get(GetScansHistoryUseCase);
    lufsQueueService = module.get(LufsAnalysisQueueService);
    djAnalysisQueue = module.get(DjAnalysisQueueService);
    libraryCleanup = module.get(LibraryCleanupService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('startScan', () => {
    it('should start a scan and return the result', async () => {
      const mockResult = {
        id: 'scan-1',
        status: 'running',
        message: 'Scan started',
      };
      startScanUseCase.execute.mockResolvedValue(mockResult as any);

      const dto = { path: '/music', recursive: true, pruneDeleted: false };
      const result = await controller.startScan(dto as any);

      expect(startScanUseCase.execute).toHaveBeenCalledWith({
        path: '/music',
        recursive: true,
        pruneDeleted: false,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('getLufsStatus', () => {
    it('should return LUFS analysis queue stats', async () => {
      const mockStats = {
        isRunning: true,
        pendingTracks: 50,
        processedInSession: 100,
        startedAt: new Date('2025-01-01'),
        concurrency: 4,
      };
      lufsQueueService.getQueueStats.mockResolvedValue(mockStats as any);

      const result = await controller.getLufsStatus();

      expect(lufsQueueService.getQueueStats).toHaveBeenCalled();
      expect(result.isRunning).toBe(true);
      expect(result.pendingTracks).toBe(50);
    });
  });

  describe('getDjStatus', () => {
    it('should return DJ analysis queue stats', async () => {
      const mockStats = {
        isRunning: false,
        pendingTracks: 0,
        processedInSession: 200,
        startedAt: null,
        concurrency: 2,
      };
      djAnalysisQueue.getQueueStats.mockResolvedValue(mockStats as any);

      const result = await controller.getDjStatus();

      expect(djAnalysisQueue.getQueueStats).toHaveBeenCalled();
      expect(result.isRunning).toBe(false);
    });
  });

  describe('getScanStatus', () => {
    it('should return the status of a specific scan', async () => {
      const mockStatus = {
        id: 'scan-1',
        status: 'completed',
        tracksAdded: 150,
        tracksUpdated: 10,
      };
      getScanStatusUseCase.execute.mockResolvedValue(mockStatus as any);

      const result = await controller.getScanStatus('scan-1');

      expect(getScanStatusUseCase.execute).toHaveBeenCalledWith({ id: 'scan-1' });
      expect(result).toEqual(mockStatus);
    });
  });

  describe('getScansHistory', () => {
    it('should return scan history', async () => {
      const mockHistory = {
        scans: [{ id: 'scan-1', status: 'completed' }],
        total: 1,
        page: 1,
        limit: 10,
      };
      getScansHistoryUseCase.execute.mockResolvedValue(mockHistory as any);

      const query = { page: 1, limit: 10 };
      const result = await controller.getScansHistory(query as any);

      expect(getScansHistoryUseCase.execute).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockHistory);
    });
  });

  describe('getMissingFiles', () => {
    it('should return missing files list with count and purge mode', async () => {
      const mockTracks = [
        { id: 'track-1', title: 'Missing Song', path: '/music/missing.mp3' },
      ];
      libraryCleanup.getMissingTracks.mockResolvedValue(mockTracks as any);
      libraryCleanup.getPurgeMode.mockResolvedValue('never' as any);

      const result = await controller.getMissingFiles();

      expect(libraryCleanup.getMissingTracks).toHaveBeenCalled();
      expect(libraryCleanup.getPurgeMode).toHaveBeenCalled();
      expect(result.tracks).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.purgeMode).toBe('never');
    });
  });

  describe('purgeMissingFiles', () => {
    it('should purge missing files and return result', async () => {
      libraryCleanup.purgeOldMissingTracks.mockResolvedValue(3);

      const result = await controller.purgeMissingFiles();

      expect(libraryCleanup.purgeOldMissingTracks).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.deleted).toBe(3);
    });

    it('should return zero deleted when nothing to purge', async () => {
      libraryCleanup.purgeOldMissingTracks.mockResolvedValue(0);

      const result = await controller.purgeMissingFiles();

      expect(result.deleted).toBe(0);
    });
  });

  describe('deleteMissingTrack', () => {
    it('should delete a specific missing track', async () => {
      libraryCleanup.deleteMissingTrackById.mockResolvedValue({
        trackDeleted: true,
        albumDeleted: false,
        artistDeleted: false,
      } as any);

      const result = await controller.deleteMissingTrack('track-1');

      expect(libraryCleanup.deleteMissingTrackById).toHaveBeenCalledWith('track-1');
      expect(result.success).toBe(true);
    });

    it('should return failure when track not found', async () => {
      libraryCleanup.deleteMissingTrackById.mockResolvedValue({
        trackDeleted: false,
        albumDeleted: false,
        artistDeleted: false,
      } as any);

      const result = await controller.deleteMissingTrack('nonexistent');

      expect(result.success).toBe(false);
    });
  });

  describe('getPurgeMode', () => {
    it('should return current purge mode', async () => {
      libraryCleanup.getPurgeMode.mockResolvedValue('never' as any);

      const result = await controller.getPurgeMode();

      expect(libraryCleanup.getPurgeMode).toHaveBeenCalled();
      expect(result.mode).toBe('never');
    });
  });
});
