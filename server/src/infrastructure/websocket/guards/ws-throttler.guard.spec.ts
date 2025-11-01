import { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { WsThrottlerGuard } from './ws-throttler.guard';
import { Socket } from 'socket.io';

describe('WsThrottlerGuard', () => {
  let guard: WsThrottlerGuard;
  let mockSocket: Partial<Socket>;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    guard = new WsThrottlerGuard();

    mockSocket = {
      id: 'test-socket-id',
      once: jest.fn(),
    };

    mockContext = {
      switchToWs: () => ({
        getClient: () => mockSocket,
      }),
    } as any;
  });

  describe('canActivate', () => {
    it('should allow first request', async () => {
      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should allow requests under the limit', async () => {
      // Hacer 19 requests (bajo el límite de 20)
      for (let i = 0; i < 19; i++) {
        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
      }
    });

    it('should block request when limit is exceeded', async () => {
      // Hacer 20 requests (límite exacto)
      for (let i = 0; i < 20; i++) {
        await guard.canActivate(mockContext);
      }

      // El request 21 debe fallar
      await expect(guard.canActivate(mockContext)).rejects.toThrow(WsException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Too many requests');
    });

    it('should reset after time window passes', async () => {
      // Hacer 20 requests
      for (let i = 0; i < 20; i++) {
        await guard.canActivate(mockContext);
      }

      // Esperar más de 1 segundo (ventana de tiempo)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Ahora debería permitir nuevamente
      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should track different clients separately', async () => {
      const mockSocket2 = {
        id: 'another-socket-id',
        once: jest.fn(),
      };

      const mockContext2 = {
        switchToWs: () => ({
          getClient: () => mockSocket2,
        }),
      } as any;

      // Cliente 1 hace 20 requests
      for (let i = 0; i < 20; i++) {
        await guard.canActivate(mockContext);
      }

      // Cliente 2 debería poder hacer requests
      const result = await guard.canActivate(mockContext2);
      expect(result).toBe(true);
    });

    it('should register cleanup on disconnect', async () => {
      await guard.canActivate(mockContext);

      expect(mockSocket.once).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });
});
