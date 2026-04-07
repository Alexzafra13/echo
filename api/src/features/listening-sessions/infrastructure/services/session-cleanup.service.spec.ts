import { SessionCleanupService } from './session-cleanup.service';
import { createMockPinoLogger } from '@shared/testing/mock.types';
import { PinoLogger } from 'nestjs-pino';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { IListeningSessionRepository } from '../../domain/ports/listening-session-repository.port';
import { ListeningSessionsGateway } from '../../presentation/gateway/listening-sessions.gateway';

describe('SessionCleanupService', () => {
  let service: SessionCleanupService;
  let mockBullmq: {
    addJob: jest.Mock;
    registerProcessor: jest.Mock;
    createQueue: jest.Mock;
  };
  let mockSessionRepository: {
    findById: jest.Mock;
    end: jest.Mock;
  };
  let mockGateway: {
    notifySessionEnded: jest.Mock;
  };
  let mockLogger: ReturnType<typeof createMockPinoLogger>;

  beforeEach(() => {
    mockLogger = createMockPinoLogger();
    mockBullmq = {
      addJob: jest.fn().mockResolvedValue(undefined),
      registerProcessor: jest.fn(),
      createQueue: jest.fn().mockReturnValue({
        getJob: jest.fn().mockResolvedValue(null),
      }),
    };
    mockSessionRepository = {
      findById: jest.fn(),
      end: jest.fn(),
    };
    mockGateway = {
      notifySessionEnded: jest.fn(),
    };

    service = new SessionCleanupService(
      mockLogger as unknown as PinoLogger,
      mockBullmq as unknown as BullmqService,
      mockSessionRepository as unknown as IListeningSessionRepository,
      mockGateway as unknown as ListeningSessionsGateway
    );
  });

  describe('scheduleInactivityTimeout', () => {
    it('should schedule a BullMQ job with 30 min delay', async () => {
      await service.scheduleInactivityTimeout('session-1');

      expect(mockBullmq.addJob).toHaveBeenCalledWith(
        'session-cleanup',
        'session-inactivity-timeout',
        expect.objectContaining({ sessionId: 'session-1' }),
        expect.objectContaining({
          jobId: 'inactivity-session-1',
          delay: 30 * 60 * 1000,
          removeOnComplete: true,
          removeOnFail: true,
        })
      );
    });

    it('should remove existing job before scheduling new one', async () => {
      const mockJob = { remove: jest.fn().mockResolvedValue(undefined) };
      mockBullmq.createQueue.mockReturnValue({
        getJob: jest.fn().mockResolvedValue(mockJob),
      });

      await service.scheduleInactivityTimeout('session-1');

      expect(mockJob.remove).toHaveBeenCalled();
    });
  });

  describe('resetInactivityTimeout', () => {
    it('should reschedule inactivity timeout', async () => {
      await service.resetInactivityTimeout('session-1');

      expect(mockBullmq.addJob).toHaveBeenCalledWith(
        'session-cleanup',
        'session-inactivity-timeout',
        expect.objectContaining({ sessionId: 'session-1' }),
        expect.any(Object)
      );
    });
  });

  describe('scheduleHostDisconnectTimeout', () => {
    it('should schedule a BullMQ job with 5 min delay', async () => {
      await service.scheduleHostDisconnectTimeout('session-1');

      expect(mockBullmq.addJob).toHaveBeenCalledWith(
        'session-cleanup',
        'session-host-disconnect',
        expect.objectContaining({ sessionId: 'session-1' }),
        expect.objectContaining({
          jobId: 'host-disconnect-session-1',
          delay: 5 * 60 * 1000,
        })
      );
    });
  });

  describe('cancelHostDisconnectTimeout', () => {
    it('should remove the host disconnect job', async () => {
      const mockJob = { remove: jest.fn().mockResolvedValue(undefined) };
      mockBullmq.createQueue.mockReturnValue({
        getJob: jest.fn().mockResolvedValue(mockJob),
      });

      await service.cancelHostDisconnectTimeout('session-1');

      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should not throw when job does not exist', async () => {
      mockBullmq.createQueue.mockReturnValue({
        getJob: jest.fn().mockResolvedValue(null),
      });

      await expect(service.cancelHostDisconnectTimeout('session-1')).resolves.toBeUndefined();
    });
  });

  describe('clearSessionJobs', () => {
    it('should remove both inactivity and host-disconnect jobs', async () => {
      const removedJobs: string[] = [];
      mockBullmq.createQueue.mockReturnValue({
        getJob: jest.fn().mockImplementation((jobId: string) => {
          return { remove: jest.fn().mockImplementation(() => removedJobs.push(jobId)) };
        }),
      });

      await service.clearSessionJobs('session-1');

      expect(removedJobs).toContain('inactivity-session-1');
      expect(removedJobs).toContain('host-disconnect-session-1');
    });
  });
});
