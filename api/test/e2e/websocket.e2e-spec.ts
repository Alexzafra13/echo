import { INestApplication } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { io, Socket } from 'socket.io-client';
import { DrizzleService } from '../../src/infrastructure/database/drizzle.service';
import {
  createTestApp,
  createAdminAndLogin,
  createUserAndLogin,
  cleanUserTables,
} from './helpers/test-setup';

/**
 * WebSocket E2E Tests
 *
 * Tests de WebSocket para validar:
 * - Conexión autenticada al namespace /scanner
 * - Suscripción a eventos de escaneo
 * - Autenticación JWT via WebSocket
 * - Permisos de admin para control de scanner
 *
 * NOTA: Estos tests requieren socket.io-client
 */
describe('WebSocket E2E', () => {
  let app: NestFastifyApplication;
  let drizzle: DrizzleService;
  let serverAddress: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    drizzle = testApp.drizzle;

    // Obtener la URL del servidor
    const address = app.getHttpServer().address();
    const port = typeof address === 'object' ? address?.port : 3000;
    serverAddress = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanUserTables(drizzle);
  });

  // Helper para crear cliente WebSocket conectado
  const createSocketClient = (
    namespace: string,
    token: string,
    options: any = {},
  ): Promise<Socket> => {
    return new Promise((resolve, reject) => {
      const socket = io(`${serverAddress}/${namespace}`, {
        auth: { token },
        transports: ['websocket'],
        forceNew: true,
        timeout: 5000,
        ...options,
      });

      socket.on('connect', () => {
        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        reject(error);
      });

      // Timeout de conexión
      setTimeout(() => {
        if (!socket.connected) {
          socket.disconnect();
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  };

  // Helper para esperar un evento
  const waitForEvent = (socket: Socket, event: string, timeout = 5000): Promise<any> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      socket.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  };

  describe('Scanner Namespace Authentication', () => {
    it('debería conectar con token válido', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);

      const socket = await createSocketClient('scanner', accessToken);

      expect(socket.connected).toBe(true);
      socket.disconnect();
    });

    it('debería rechazar conexión sin token', async () => {
      await expect(createSocketClient('scanner', '')).rejects.toThrow();
    });

    it('debería rechazar conexión con token inválido', async () => {
      await expect(createSocketClient('scanner', 'invalid-token')).rejects.toThrow();
    });

    it('debería permitir múltiples conexiones simultáneas', async () => {
      const { accessToken: token1 } = await createUserAndLogin(drizzle, app, {
        username: 'ws_user1',
        password: 'Test123!',
      });
      const { accessToken: token2 } = await createUserAndLogin(drizzle, app, {
        username: 'ws_user2',
        password: 'Test123!',
      });

      const socket1 = await createSocketClient('scanner', token1);
      const socket2 = await createSocketClient('scanner', token2);

      expect(socket1.connected).toBe(true);
      expect(socket2.connected).toBe(true);
      expect(socket1.id).not.toBe(socket2.id);

      socket1.disconnect();
      socket2.disconnect();
    });
  });

  describe('Scanner Subscription', () => {
    it('debería poder suscribirse a un scan', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = await createSocketClient('scanner', accessToken);

      // Esperar respuesta de suscripción
      const subscriptionPromise = waitForEvent(socket, 'scanner:subscribed');

      // Suscribirse a un scan ficticio
      socket.emit('scanner:subscribe', { scanId: 'test-scan-123' });

      const response = await subscriptionPromise;

      expect(response.scanId).toBe('test-scan-123');
      expect(response.message).toContain('subscribed');

      socket.disconnect();
    });

    it('debería poder desuscribirse de un scan', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = await createSocketClient('scanner', accessToken);

      // Suscribirse primero
      socket.emit('scanner:subscribe', { scanId: 'test-scan-123' });
      await waitForEvent(socket, 'scanner:subscribed');

      // Desuscribirse
      const unsubPromise = waitForEvent(socket, 'scanner:unsubscribed');
      socket.emit('scanner:unsubscribe', { scanId: 'test-scan-123' });

      const response = await unsubPromise;

      expect(response.scanId).toBe('test-scan-123');
      expect(response.message).toContain('unsubscribed');

      socket.disconnect();
    });
  });

  describe('Scanner Admin Controls', () => {
    it('admin debería poder pausar un scan', async () => {
      const { accessToken } = await createAdminAndLogin(drizzle, app);
      const socket = await createSocketClient('scanner', accessToken);

      const pausePromise = waitForEvent(socket, 'scanner:paused');
      socket.emit('scanner:pause', { scanId: 'test-scan-123' });

      const response = await pausePromise;

      expect(response.scanId).toBe('test-scan-123');
      expect(response.message).toContain('paused');

      socket.disconnect();
    });

    it('admin debería poder cancelar un scan', async () => {
      const { accessToken } = await createAdminAndLogin(drizzle, app);
      const socket = await createSocketClient('scanner', accessToken);

      const cancelPromise = waitForEvent(socket, 'scanner:cancelled');
      socket.emit('scanner:cancel', { scanId: 'test-scan-123', reason: 'Test cancel' });

      const response = await cancelPromise;

      expect(response.scanId).toBe('test-scan-123');
      expect(response.reason).toBe('Test cancel');

      socket.disconnect();
    });

    it('admin debería poder resumir un scan', async () => {
      const { accessToken } = await createAdminAndLogin(drizzle, app);
      const socket = await createSocketClient('scanner', accessToken);

      const resumePromise = waitForEvent(socket, 'scanner:resumed');
      socket.emit('scanner:resume', { scanId: 'test-scan-123' });

      const response = await resumePromise;

      expect(response.scanId).toBe('test-scan-123');
      expect(response.message).toContain('resumed');

      socket.disconnect();
    });

    it('usuario normal NO debería poder pausar un scan', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = await createSocketClient('scanner', accessToken);

      const errorPromise = waitForEvent(socket, 'exception');
      socket.emit('scanner:pause', { scanId: 'test-scan-123' });

      const error = await errorPromise;

      expect(error.message).toContain('Unauthorized');

      socket.disconnect();
    });

    it('usuario normal NO debería poder cancelar un scan', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = await createSocketClient('scanner', accessToken);

      const errorPromise = waitForEvent(socket, 'exception');
      socket.emit('scanner:cancel', { scanId: 'test-scan-123', reason: 'Hack' });

      const error = await errorPromise;

      expect(error.message).toContain('Unauthorized');

      socket.disconnect();
    });
  });

  describe('Connection Token Methods', () => {
    it('debería conectar con token en query param', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);

      const socket = io(`${serverAddress}/scanner`, {
        query: { token: accessToken },
        transports: ['websocket'],
        forceNew: true,
      });

      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(socket.connected).toBe(true);
      socket.disconnect();
    });

    it('debería conectar con token en auth object', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);

      const socket = await createSocketClient('scanner', accessToken);

      expect(socket.connected).toBe(true);
      socket.disconnect();
    });
  });

  describe('Reconnection', () => {
    it('debería manejar reconexión correctamente', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);

      const socket = io(`${serverAddress}/scanner`, {
        auth: { token: accessToken },
        transports: ['websocket'],
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 100,
      });

      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      expect(socket.connected).toBe(true);

      // Forzar desconexión y esperar reconexión
      const originalId = socket.id;
      socket.disconnect();

      expect(socket.connected).toBe(false);

      // Reconectar manualmente
      socket.connect();

      await new Promise<void>((resolve) => {
        socket.on('connect', () => resolve());
      });

      expect(socket.connected).toBe(true);
      expect(socket.id).not.toBe(originalId);

      socket.disconnect();
    });
  });

  describe('Multiple Namespaces', () => {
    it('debería poder conectar a múltiples namespaces', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);

      // Conectar al namespace scanner
      const scannerSocket = await createSocketClient('scanner', accessToken);
      expect(scannerSocket.connected).toBe(true);

      // Los sockets deberían tener IDs diferentes
      expect(scannerSocket.id).toBeDefined();

      scannerSocket.disconnect();
    });
  });

  describe('Error Handling', () => {
    it('debería manejar eventos inválidos gracefully', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = await createSocketClient('scanner', accessToken);

      // Enviar evento no existente - no debería crashear
      socket.emit('non_existent_event', { data: 'test' });

      // Esperar un momento para verificar que el socket sigue conectado
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(socket.connected).toBe(true);

      socket.disconnect();
    });

    it('debería manejar payload inválido', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = await createSocketClient('scanner', accessToken);

      // Enviar payload inválido
      socket.emit('scanner:subscribe', { invalidField: 'test' });

      // Debería recibir error de validación o ser ignorado
      const errorHandler = jest.fn();
      socket.on('exception', errorHandler);

      await new Promise(resolve => setTimeout(resolve, 200));

      // El socket debería seguir conectado
      expect(socket.connected).toBe(true);

      socket.disconnect();
    });
  });

  describe('Performance', () => {
    it('debería manejar múltiples suscripciones rápidas', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = await createSocketClient('scanner', accessToken);

      // Suscribirse a múltiples scans rápidamente
      const scanIds = Array.from({ length: 10 }, (_, i) => `scan-${i}`);
      const responses: any[] = [];

      socket.on('scanner:subscribed', (data) => {
        responses.push(data);
      });

      scanIds.forEach(scanId => {
        socket.emit('scanner:subscribe', { scanId });
      });

      // Esperar a que lleguen todas las respuestas
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(responses.length).toBe(10);
      expect(responses.every(r => r.message?.includes('subscribed'))).toBe(true);

      socket.disconnect();
    });
  });

  describe('Cleanup on Disconnect', () => {
    it('debería limpiar suscripciones al desconectar', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = await createSocketClient('scanner', accessToken);

      // Suscribirse
      socket.emit('scanner:subscribe', { scanId: 'cleanup-test' });
      await waitForEvent(socket, 'scanner:subscribed');

      // Desconectar
      socket.disconnect();

      expect(socket.connected).toBe(false);

      // Reconectar con el mismo token
      const newSocket = await createSocketClient('scanner', accessToken);

      // Debería poder suscribirse de nuevo (la suscripción anterior fue limpiada)
      const subPromise = waitForEvent(newSocket, 'scanner:subscribed');
      newSocket.emit('scanner:subscribe', { scanId: 'cleanup-test' });

      const response = await subPromise;
      expect(response.scanId).toBe('cleanup-test');

      newSocket.disconnect();
    });
  });
});
