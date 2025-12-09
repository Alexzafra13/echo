import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LufsAnalysisQueueService, LufsQueueStats } from './lufs-analysis-queue.service';
import { LufsAnalyzerService, LufsAnalysisResult } from './lufs-analyzer.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { ScannerEventsService } from '../../domain/services/scanner-events.service';
import { getLoggerToken } from 'nestjs-pino';

describe('LufsAnalysisQueueService', () => {
  let service: LufsAnalysisQueueService;
  let mockDrizzle: any;
  let mockBullmq: any;
  let mockLufsAnalyzer: any;
  let mockScannerEventsService: any;
  let mockConfigService: any;
  let mockLogger: any;

  // Track mocks for database queries
  const mockTracks = [
    { id: 'track-1', title: 'Song 1', path: '/music/song1.mp3' },
    { id: 'track-2', title: 'Song 2', path: '/music/song2.mp3' },
    { id: 'track-3', title: 'Song 3', path: '/music/song3.mp3' },
  ];

  beforeEach(async () => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    };

    // Mock DrizzleService with chainable query builder
    const mockSelectResult = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(mockTracks),
      groupBy: jest.fn().mockResolvedValue([]),
    };

    const mockUpdateResult = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(undefined),
    };

    mockDrizzle = {
      db: {
        select: jest.fn().mockReturnValue(mockSelectResult),
        update: jest.fn().mockReturnValue(mockUpdateResult),
      },
    };

    // Mock BullMQ service
    mockBullmq = {
      registerProcessor: jest.fn(),
      addJob: jest.fn().mockResolvedValue(undefined),
    };

    // Mock LUFS analyzer
    mockLufsAnalyzer = {
      isFFmpegAvailable: jest.fn().mockResolvedValue(true),
      analyzeFile: jest.fn().mockResolvedValue({
        inputLufs: -14.5,
        inputPeak: -1.0,
        trackGain: -1.5,
        trackPeak: 0.89,
      } as LufsAnalysisResult),
    };

    // Mock scanner events service
    mockScannerEventsService = {
      emitLufsProgress: jest.fn(),
    };

    // Mock config service
    mockConfigService = {
      get: jest.fn().mockReturnValue(undefined), // Use auto-detection
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LufsAnalysisQueueService,
        {
          provide: DrizzleService,
          useValue: mockDrizzle,
        },
        {
          provide: BullmqService,
          useValue: mockBullmq,
        },
        {
          provide: LufsAnalyzerService,
          useValue: mockLufsAnalyzer,
        },
        {
          provide: ScannerEventsService,
          useValue: mockScannerEventsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getLoggerToken(LufsAnalysisQueueService.name),
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<LufsAnalysisQueueService>(LufsAnalysisQueueService);
  });

  describe('onModuleInit', () => {
    it('should register the job processor with concurrency', async () => {
      // Act
      await service.onModuleInit();

      // Assert
      expect(mockBullmq.registerProcessor).toHaveBeenCalledWith(
        'lufs-analysis-queue',
        expect.any(Function),
        expect.objectContaining({
          concurrency: expect.any(Number),
        }),
      );
    });

    it('should log initialization with concurrency info', async () => {
      // Act
      await service.onModuleInit();

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('LufsAnalysisQueueService initialized'),
      );
    });
  });

  describe('startLufsAnalysisQueue', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should not start if FFmpeg is not available', async () => {
      // Arrange
      mockLufsAnalyzer.isFFmpegAvailable.mockResolvedValue(false);

      // Act
      const result = await service.startLufsAnalysisQueue();

      // Assert
      expect(result.started).toBe(false);
      expect(result.message).toContain('FFmpeg not available');
    });

    it('should not start if already running', async () => {
      // Arrange - Start the queue first
      await service.startLufsAnalysisQueue();

      // Act - Try to start again
      const result = await service.startLufsAnalysisQueue();

      // Assert
      expect(result.started).toBe(false);
      expect(result.message).toContain('already running');
    });

    it('should return early if no pending tracks', async () => {
      // Arrange
      const mockSelectResult = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]), // No pending tracks
      };
      mockDrizzle.db.select.mockReturnValue(mockSelectResult);

      // Act
      const result = await service.startLufsAnalysisQueue();

      // Assert
      expect(result.started).toBe(false);
      expect(result.pending).toBe(0);
      expect(result.message).toContain('No tracks pending');
    });

    it('should enqueue all pending tracks', async () => {
      // Arrange
      const mockSelectResult = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockTracks),
      };
      mockDrizzle.db.select.mockReturnValue(mockSelectResult);

      // Act
      const result = await service.startLufsAnalysisQueue();

      // Assert
      expect(result.started).toBe(true);
      expect(result.pending).toBe(3);
      expect(mockBullmq.addJob).toHaveBeenCalledTimes(3);
    });

    it('should emit initial progress via SSE', async () => {
      // Arrange
      const mockSelectResult = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockTracks),
      };
      mockDrizzle.db.select.mockReturnValue(mockSelectResult);

      // Act
      await service.startLufsAnalysisQueue();

      // Assert
      expect(mockScannerEventsService.emitLufsProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          isRunning: true,
          pendingTracks: expect.any(Number),
          processedInSession: 0,
        }),
      );
    });

    it('should add jobs with correct options', async () => {
      // Arrange
      const mockSelectResult = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockTracks[0]]),
      };
      mockDrizzle.db.select.mockReturnValue(mockSelectResult);

      // Act
      await service.startLufsAnalysisQueue();

      // Assert
      expect(mockBullmq.addJob).toHaveBeenCalledWith(
        'lufs-analysis-queue',
        'analyze-track',
        expect.objectContaining({
          trackId: 'track-1',
          trackTitle: 'Song 1',
          filePath: '/music/song1.mp3',
        }),
        expect.objectContaining({
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: true,
        }),
      );
    });
  });

  describe('stopLufsAnalysisQueue', () => {
    it('should set isRunning to false', async () => {
      // Act
      await service.stopLufsAnalysisQueue();

      // Assert
      const stats = await service.getQueueStats();
      expect(stats.isRunning).toBe(false);
    });

    it('should log stop message', async () => {
      // Act
      await service.stopLufsAnalysisQueue();

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('LUFS analysis queue stopped'),
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return current queue statistics', async () => {
      // Arrange
      const mockSelectResult = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 5 }]),
      };
      mockDrizzle.db.select.mockReturnValue(mockSelectResult);

      // Act
      const stats = await service.getQueueStats();

      // Assert
      expect(stats).toMatchObject({
        isRunning: expect.any(Boolean),
        pendingTracks: 5,
        processedInSession: expect.any(Number),
        currentTrack: null,
        startedAt: null,
      });
    });

    it('should calculate estimated time remaining when running', async () => {
      // Arrange - Start the queue first
      const mockSelectResult = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn()
          .mockResolvedValueOnce(mockTracks) // For startLufsAnalysisQueue
          .mockResolvedValue([{ count: 10 }]), // For getQueueStats
      };
      mockDrizzle.db.select.mockReturnValue(mockSelectResult);

      await service.onModuleInit();
      await service.startLufsAnalysisQueue();

      // Act
      const stats = await service.getQueueStats();

      // Assert
      expect(stats.isRunning).toBe(true);
      expect(stats.estimatedTimeRemaining).toBeTruthy();
    });
  });

  describe('processLufsJob (via processor)', () => {
    let jobProcessor: (job: any) => Promise<void>;

    beforeEach(async () => {
      await service.onModuleInit();

      // Capture the registered processor function
      jobProcessor = mockBullmq.registerProcessor.mock.calls[0][1];
    });

    it('should analyze file and update database on success', async () => {
      // Arrange
      const mockJob = {
        data: {
          trackId: 'track-1',
          trackTitle: 'Test Song',
          filePath: '/music/test.mp3',
        },
      };

      const mockUpdateResult = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDrizzle.db.update.mockReturnValue(mockUpdateResult);

      // Act
      await jobProcessor(mockJob);

      // Assert
      expect(mockLufsAnalyzer.analyzeFile).toHaveBeenCalledWith('/music/test.mp3');
      expect(mockDrizzle.db.update).toHaveBeenCalled();
      expect(mockUpdateResult.set).toHaveBeenCalledWith(
        expect.objectContaining({
          rgTrackGain: expect.any(Number),
          rgTrackPeak: expect.any(Number),
          lufsAnalyzedAt: expect.any(Date),
        }),
      );
    });

    it('should mark track as analyzed even when analysis returns null', async () => {
      // Arrange
      mockLufsAnalyzer.analyzeFile.mockResolvedValue(null);

      const mockJob = {
        data: {
          trackId: 'track-1',
          trackTitle: 'Broken Song',
          filePath: '/music/broken.mp3',
        },
      };

      const mockUpdateResult = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDrizzle.db.update.mockReturnValue(mockUpdateResult);

      // Act
      await jobProcessor(mockJob);

      // Assert
      expect(mockDrizzle.db.update).toHaveBeenCalled();
      expect(mockUpdateResult.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lufsAnalyzedAt: expect.any(Date),
        }),
      );
      // Should NOT include gain/peak values
      expect(mockUpdateResult.set).not.toHaveBeenCalledWith(
        expect.objectContaining({
          rgTrackGain: expect.any(Number),
        }),
      );
    });

    it('should mark track as analyzed on error to prevent retry loops', async () => {
      // Arrange
      mockLufsAnalyzer.analyzeFile.mockRejectedValue(new Error('FFmpeg crashed'));

      const mockJob = {
        data: {
          trackId: 'track-1',
          trackTitle: 'Crash Song',
          filePath: '/music/crash.mp3',
        },
      };

      const mockUpdateResult = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDrizzle.db.update.mockReturnValue(mockUpdateResult);

      // Act
      await jobProcessor(mockJob);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error analyzing'),
      );
      expect(mockDrizzle.db.update).toHaveBeenCalled();
    });

    it('should emit SSE progress periodically', async () => {
      // Arrange
      const mockUpdateResult = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDrizzle.db.update.mockReturnValue(mockUpdateResult);

      const mockJob = {
        data: {
          trackId: 'track-1',
          trackTitle: 'Song 1',
          filePath: '/music/song1.mp3',
        },
      };

      // Act - Process first job
      await jobProcessor(mockJob);

      // Assert - First job should emit progress
      expect(mockScannerEventsService.emitLufsProgress).toHaveBeenCalled();
    });
  });

  describe('formatDuration', () => {
    it('should format seconds correctly', async () => {
      // We need to access the private method via reflection or test through public API
      // Testing through getQueueStats which uses formatDuration internally

      const mockSelectResult = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn()
          .mockResolvedValueOnce(mockTracks)
          .mockResolvedValue([{ count: 2 }]),
      };
      mockDrizzle.db.select.mockReturnValue(mockSelectResult);

      await service.onModuleInit();
      await service.startLufsAnalysisQueue();

      const stats = await service.getQueueStats();

      // Just verify it returns a formatted string
      expect(stats.estimatedTimeRemaining).toMatch(/^\d+[smh]/);
    });
  });

  describe('calculateAlbumGains', () => {
    it('should be called after all tracks are processed', async () => {
      // This is tested indirectly through the completion flow
      // When processedInSession >= totalToProcess, calculateAlbumGains is called

      const mockSelectResult = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockTracks[0]]), // Only one track
        groupBy: jest.fn().mockResolvedValue([
          { albumId: 'album-1', avgGain: -2.5, maxPeak: 0.95, trackCount: 1 },
        ]),
      };
      mockDrizzle.db.select.mockReturnValue(mockSelectResult);

      const mockUpdateResult = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDrizzle.db.update.mockReturnValue(mockUpdateResult);

      await service.onModuleInit();
      await service.startLufsAnalysisQueue();

      // Get the processor and run it
      const jobProcessor = mockBullmq.registerProcessor.mock.calls[0][1];
      await jobProcessor({
        data: {
          trackId: 'track-1',
          trackTitle: 'Song 1',
          filePath: '/music/song1.mp3',
        },
      });

      // Assert - Album gains calculation should have been attempted
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('album gains'),
      );
    });
  });

  describe('concurrency configuration', () => {
    it('should use LUFS_CONCURRENCY env var when set', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue(4);

      // Create new instance with configured concurrency
      const module = await Test.createTestingModule({
        providers: [
          LufsAnalysisQueueService,
          { provide: DrizzleService, useValue: mockDrizzle },
          { provide: BullmqService, useValue: mockBullmq },
          { provide: LufsAnalyzerService, useValue: mockLufsAnalyzer },
          { provide: ScannerEventsService, useValue: mockScannerEventsService },
          { provide: ConfigService, useValue: mockConfigService },
          {
            provide: getLoggerToken(LufsAnalysisQueueService.name),
            useValue: mockLogger,
          },
        ],
      }).compile();

      const configuredService = module.get<LufsAnalysisQueueService>(LufsAnalysisQueueService);
      await configuredService.onModuleInit();

      // Assert
      expect(mockBullmq.registerProcessor).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({ concurrency: 4 }),
      );
    });
  });
});
