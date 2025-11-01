import { Test, TestingModule } from '@nestjs/testing';
import { ScannerGateway } from './scanner.gateway';
import { Server, Socket } from 'socket.io';
import { ScanStatus } from '../../presentation/dtos/scanner-events.dto';
import { WsJwtGuard } from '../../../../infrastructure/websocket/guards/ws-jwt.guard';
import { WsThrottlerGuard } from '../../../../infrastructure/websocket/guards/ws-throttler.guard';

describe('ScannerGateway', () => {
  let gateway: ScannerGateway;
  let mockServer: Partial<Server>;
  let mockSocket: Partial<Socket>;

  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockSocket = {
      id: 'test-socket-id',
      data: {
        userId: 'user-123',
      },
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ScannerGateway],
    })
      .overrideGuard(WsJwtGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(WsThrottlerGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    gateway = module.get<ScannerGateway>(ScannerGateway);
    gateway.server = mockServer as Server;
  });

  describe('lifecycle', () => {
    it('should be defined', () => {
      expect(gateway).toBeDefined();
    });

    it('should log on init', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      gateway.afterInit(mockServer as Server);
      expect(logSpy).toHaveBeenCalledWith('🔌 ScannerGateway initialized');
    });

    it('should log on connection', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      gateway.handleConnection(mockSocket as Socket);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Client connected to scanner namespace')
      );
    });

    it('should log on disconnection', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      gateway.handleDisconnect(mockSocket as Socket);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Client disconnected from scanner namespace')
      );
    });
  });

  describe('handleSubscribe', () => {
    it('should join client to scan room', async () => {
      const dto = { scanId: 'scan-123' };

      await gateway.handleSubscribe(mockSocket as Socket, dto);

      expect(mockSocket.join).toHaveBeenCalledWith('scan:scan-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('scanner:subscribed', {
        scanId: 'scan-123',
        message: 'Successfully subscribed to scan events',
      });
    });
  });

  describe('handleUnsubscribe', () => {
    it('should remove client from scan room', async () => {
      const dto = { scanId: 'scan-123' };

      await gateway.handleUnsubscribe(mockSocket as Socket, dto);

      expect(mockSocket.leave).toHaveBeenCalledWith('scan:scan-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('scanner:unsubscribed', {
        scanId: 'scan-123',
        message: 'Successfully unsubscribed from scan events',
      });
    });
  });

  describe('emitProgress', () => {
    it('should emit progress to scan room', () => {
      const progressData = {
        scanId: 'scan-123',
        status: ScanStatus.SCANNING,
        progress: 50,
        filesScanned: 50,
        totalFiles: 100,
        tracksCreated: 45,
        albumsCreated: 5,
        artistsCreated: 3,
        coversExtracted: 4,
        errors: 1,
        message: 'Processing files...',
      };

      gateway.emitProgress(progressData);

      expect(mockServer.to).toHaveBeenCalledWith('scan:scan-123');
      expect(mockServer.emit).toHaveBeenCalledWith('scan:progress', progressData);
    });
  });

  describe('emitError', () => {
    it('should emit error to scan room', () => {
      const errorData = {
        scanId: 'scan-123',
        file: '/path/to/file.mp3',
        error: 'Failed to parse metadata',
        timestamp: new Date().toISOString(),
      };

      gateway.emitError(errorData);

      expect(mockServer.to).toHaveBeenCalledWith('scan:scan-123');
      expect(mockServer.emit).toHaveBeenCalledWith('scan:error', errorData);
    });
  });

  describe('emitCompleted', () => {
    it('should emit completed to scan room', () => {
      const completedData = {
        scanId: 'scan-123',
        totalFiles: 100,
        tracksCreated: 95,
        albumsCreated: 10,
        artistsCreated: 8,
        coversExtracted: 9,
        errors: 5,
        duration: 60000,
        timestamp: new Date().toISOString(),
      };

      gateway.emitCompleted(completedData);

      expect(mockServer.to).toHaveBeenCalledWith('scan:scan-123');
      expect(mockServer.emit).toHaveBeenCalledWith('scan:completed', completedData);
    });
  });

  describe('handlePause', () => {
    it('should emit paused confirmation', async () => {
      const dto = { scanId: 'scan-123' };

      await gateway.handlePause(mockSocket as Socket, dto);

      expect(mockSocket.emit).toHaveBeenCalledWith('scanner:paused', {
        scanId: 'scan-123',
        message: 'Scan paused successfully',
      });
    });
  });

  describe('handleCancel', () => {
    it('should emit cancelled confirmation', async () => {
      const dto = { scanId: 'scan-123', reason: 'User requested' };

      await gateway.handleCancel(mockSocket as Socket, dto);

      expect(mockSocket.emit).toHaveBeenCalledWith('scanner:cancelled', {
        scanId: 'scan-123',
        reason: 'User requested',
        message: 'Scan cancelled successfully',
      });
    });
  });

  describe('handleResume', () => {
    it('should emit resumed confirmation', async () => {
      const dto = { scanId: 'scan-123' };

      await gateway.handleResume(mockSocket as Socket, dto);

      expect(mockSocket.emit).toHaveBeenCalledWith('scanner:resumed', {
        scanId: 'scan-123',
        message: 'Scan resumed successfully',
      });
    });
  });
});
