import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { WaveMixSchedulerService } from './wave-mix-scheduler.service';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { WaveMixService } from '../services/wave-mix.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';

describe('WaveMixSchedulerService', () => {
  let service: WaveMixSchedulerService;
  let mockLogger: any;
  let mockBullmqService: any;
  let mockWaveMixService: any;
  let mockDrizzle: any;

  // Mock data holder
  let mockUsersData: any[] = [];

  beforeEach(async () => {
    // Reset mock data
    mockUsersData = [];

    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockBullmqService = {
      createQueue: jest.fn().mockReturnValue({
        getRepeatableJobs: jest.fn().mockResolvedValue([]),
        removeRepeatableByKey: jest.fn().mockResolvedValue(true),
      }),
      registerProcessor: jest.fn(),
      addJob: jest.fn(),
    };

    mockWaveMixService = {
      refreshAutoPlaylists: jest.fn(),
    };

    // Create chainable mock for Drizzle query builder
    mockDrizzle = {
      db: {
        select: jest.fn().mockImplementation(() => ({
          from: jest.fn().mockImplementation(() => Promise.resolve(mockUsersData)),
        })),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaveMixSchedulerService,
        {
          provide: `PinoLogger:${WaveMixSchedulerService.name}`,
          useValue: mockLogger,
        },
        {
          provide: BullmqService,
          useValue: mockBullmqService,
        },
        {
          provide: WaveMixService,
          useValue: mockWaveMixService,
        },
        {
          provide: DrizzleService,
          useValue: mockDrizzle,
        },
      ],
    }).compile();

    service = module.get<WaveMixSchedulerService>(WaveMixSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('debería registrar el procesador y programar la regeneración diaria', async () => {
      // Act
      await service.onModuleInit();

      // Assert
      expect(mockBullmqService.registerProcessor).toHaveBeenCalledWith(
        'wave-mix-scheduler',
        expect.any(Function)
      );
      expect(mockBullmqService.createQueue).toHaveBeenCalledWith('wave-mix-scheduler');
      expect(mockBullmqService.addJob).toHaveBeenCalledWith(
        'wave-mix-scheduler',
        'regenerate-all-wave-mixes',
        {},
        expect.objectContaining({
          repeat: {
            pattern: '0 4 * * *', // 4:00 AM daily
          },
          attempts: 3,
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Wave Mix Scheduler initialized');
    });
  });

  describe('regenerateAllWaveMixes', () => {
    it('debería regenerar Wave Mix para todos los usuarios', async () => {
      // Arrange
      mockUsersData = [
        { id: 'user-1', username: 'user1' },
        { id: 'user-2', username: 'user2' },
        { id: 'user-3', username: 'user3' },
      ];
      mockWaveMixService.refreshAutoPlaylists.mockResolvedValue([]);

      // Act
      await service.regenerateAllWaveMixes();

      // Assert
      expect(mockDrizzle.db.select).toHaveBeenCalled();
      expect(mockWaveMixService.refreshAutoPlaylists).toHaveBeenCalledTimes(3);
      expect(mockWaveMixService.refreshAutoPlaylists).toHaveBeenCalledWith('user-1');
      expect(mockWaveMixService.refreshAutoPlaylists).toHaveBeenCalledWith('user-2');
      expect(mockWaveMixService.refreshAutoPlaylists).toHaveBeenCalledWith('user-3');
      expect(mockLogger.info).toHaveBeenCalledWith(
        { successCount: 3, errorCount: 0, totalUsers: 3 },
        'Daily Wave Mix regeneration completed'
      );
    });

    it('debería manejar errores individuales sin fallar todo el proceso', async () => {
      // Arrange
      mockUsersData = [
        { id: 'user-1', username: 'user1' },
        { id: 'user-2', username: 'user2' },
      ];
      mockWaveMixService.refreshAutoPlaylists
        .mockResolvedValueOnce([]) // user-1 succeeds
        .mockRejectedValueOnce(new Error('Redis error')); // user-2 fails

      // Act
      await service.regenerateAllWaveMixes();

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        { successCount: 1, errorCount: 1, totalUsers: 2 },
        'Daily Wave Mix regeneration completed'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('regenerateUserWaveMix', () => {
    it('debería regenerar Wave Mix para un usuario específico', async () => {
      // Arrange
      const userId = 'user-123';
      mockWaveMixService.refreshAutoPlaylists.mockResolvedValue([]);

      // Act
      await service.regenerateUserWaveMix(userId);

      // Assert
      expect(mockWaveMixService.refreshAutoPlaylists).toHaveBeenCalledWith(userId);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId },
        'Regenerating Wave Mix for user'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId },
        'Wave Mix regenerated successfully'
      );
    });
  });

  describe('triggerUserRegeneration', () => {
    it('debería encolar un job de regeneración para un usuario', async () => {
      // Arrange
      const userId = 'user-123';

      // Act
      await service.triggerUserRegeneration(userId);

      // Assert
      expect(mockBullmqService.addJob).toHaveBeenCalledWith(
        'wave-mix-scheduler',
        'regenerate-user-wave-mix',
        { userId },
        expect.objectContaining({
          attempts: 3,
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId },
        'Queued Wave Mix regeneration for user'
      );
    });
  });

  describe('triggerImmediateRegeneration', () => {
    it('debería encolar un job de regeneración inmediata para todos los usuarios', async () => {
      // Act
      await service.triggerImmediateRegeneration();

      // Assert
      expect(mockBullmqService.addJob).toHaveBeenCalledWith(
        'wave-mix-scheduler',
        'regenerate-all-wave-mixes',
        {},
        expect.objectContaining({
          attempts: 3,
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Queued immediate Wave Mix regeneration for all users'
      );
    });
  });
});
