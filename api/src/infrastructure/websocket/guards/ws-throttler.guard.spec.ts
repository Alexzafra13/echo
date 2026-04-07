import { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { PinoLogger } from 'nestjs-pino';
import { WsThrottlerGuard } from './ws-throttler.guard';
import { Socket } from 'socket.io';

const createMockLogger = (): jest.Mocked<PinoLogger> =>
  ({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    setContext: jest.fn(),
    assign: jest.fn(),
  }) as unknown as jest.Mocked<PinoLogger>;

describe('WsThrottlerGuard', () => {
  let guard: WsThrottlerGuard;
  let mockSocket: Partial<Socket>;
  let mockContext: ExecutionContext;
  let mockLogger: jest.Mocked<PinoLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    guard = new WsThrottlerGuard(mockLogger);

    mockSocket = {
      id: 'test-socket-id',
      once: jest.fn(),
    };

    mockContext = {
      switchToWs: () => ({
        getClient: () => mockSocket,
      }),
    } as unknown as ExecutionContext;
  });

  afterEach(() => {
    guard.onModuleDestroy();
  });

  describe('lifecycle', () => {
    it('should initialize cleanup interval on module init', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      guard.onModuleInit();

      // 5 minutos = 5 * 60 * 1000
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
      setIntervalSpy.mockRestore();
    });

    it('should clear interval on module destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      guard.onModuleInit();
      guard.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('canActivate - Fixed Window Counter', () => {
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
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Demasiadas solicitudes');
    });

    it('should reset counter after time window passes', async () => {
      // Hacer 20 requests (alcanzar límite)
      for (let i = 0; i < 20; i++) {
        await guard.canActivate(mockContext);
      }

      // Esperar más de 1 segundo (ventana de tiempo)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Nueva ventana, contador reseteado → debería permitir
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
      } as unknown as ExecutionContext;

      // Cliente 1 alcanza límite
      for (let i = 0; i < 20; i++) {
        await guard.canActivate(mockContext);
      }

      // Cliente 2 tiene su propia ventana → debería poder hacer requests
      const result = await guard.canActivate(mockContext2);
      expect(result).toBe(true);
    });

    it('should register disconnect listener only once per client', async () => {
      // Múltiples requests del mismo cliente
      await guard.canActivate(mockContext);
      await guard.canActivate(mockContext);
      await guard.canActivate(mockContext);

      // Solo debe registrar el listener una vez (evita memory leak)
      expect(mockSocket.once).toHaveBeenCalledTimes(1);
      expect(mockSocket.once).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });
});
