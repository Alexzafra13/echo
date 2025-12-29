import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { io, Socket } from 'socket.io-client';
import { DrizzleService } from '../../src/infrastructure/database/drizzle.service';
import {
  createTestApp,
  createUserAndLogin,
  createAdminAndLogin,
  cleanUserTables,
} from './helpers/test-setup';

/**
 * WebSocket E2E Tests
 *
 * Tests de WebSocket para validar:
 * - Autenticación JWT via WebSocket (query param, auth object, header)
 * - Conexión y desconexión correcta
 * - Suscripción a eventos de scan
 * - Control de scanner (solo admin)
 * - Aislamiento entre usuarios
 * - Manejo de errores y edge cases
 *
 * El gateway soporta los siguientes eventos:
 * - scanner:subscribe / scanner:unsubscribe - Suscripción a scans
 * - scanner:pause / scanner:cancel / scanner:resume - Control (solo admin)
 * - scan:progress / scan:error / scan:completed - Eventos del servidor
 */
describe('WebSocket E2E', () => {
  let app: NestFastifyApplication;
  let drizzle: DrizzleService;
  let serverAddress: string;

  // Helper para crear un socket conectado
  const createSocket = (
    token: string,
    options: {
      method?: 'auth' | 'query' | 'header';
      namespace?: string;
    } = {},
  ): Socket => {
    const { method = 'auth', namespace = '/scanner' } = options;

    const socketOptions: {
      transports: ('websocket' | 'polling')[];
      forceNew: boolean;
      timeout: number;
      reconnection: boolean;
      query?: { token: string };
      extraHeaders?: { Authorization: string };
      auth?: { token: string };
    } = {
      // Use polling first, then upgrade to websocket (more reliable in tests)
      transports: ['polling', 'websocket'],
      forceNew: true,
      timeout: 5000,
      reconnection: false,
    };

    switch (method) {
      case 'query':
        socketOptions.query = { token };
        break;
      case 'header':
        socketOptions.extraHeaders = { Authorization: `Bearer ${token}` };
        break;
      case 'auth':
      default:
        socketOptions.auth = { token };
        break;
    }

    return io(`${serverAddress}${namespace}`, socketOptions);
  };

  // Helper para esperar conexión exitosa
  const waitForConnect = (socket: Socket, timeout = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Connection timeout'));
      }, timeout);

      socket.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timer);
        socket.disconnect();
        reject(err);
      });
    });
  };

  // Helper para esperar un evento específico
  const waitForEvent = <T>(
    socket: Socket,
    event: string,
    timeout = 3000,
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      socket.once(event, (data: T) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  };

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    drizzle = testApp.drizzle;

    // WebSocket tests require the server to actually listen on a port
    // (unlike HTTP tests with supertest which can work with the raw server)
    await app.listen(0, '127.0.0.1');

    // Obtener la URL del servidor
    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    serverAddress = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanUserTables(drizzle);
  });

  describe('Scanner Namespace Authentication', () => {
    it('debería conectar con token válido', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      try {
        await waitForConnect(socket);
        expect(socket.connected).toBe(true);
      } finally {
        socket.disconnect();
      }
    });

    it('debería permitir múltiples conexiones simultáneas', async () => {
      const { accessToken: token1 } = await createUserAndLogin(drizzle, app, {
        username: 'user1',
        password: 'Test123!',
      });
      const { accessToken: token2 } = await createUserAndLogin(drizzle, app, {
        username: 'user2',
        password: 'Test123!',
      });

      const socket1 = createSocket(token1);
      const socket2 = createSocket(token2);

      try {
        await Promise.all([waitForConnect(socket1), waitForConnect(socket2)]);

        expect(socket1.connected).toBe(true);
        expect(socket2.connected).toBe(true);
        expect(socket1.id).not.toBe(socket2.id);
      } finally {
        socket1.disconnect();
        socket2.disconnect();
      }
    });

    it('debería rechazar conexión sin token', async () => {
      const socket = io(`${serverAddress}/scanner`, {
        auth: { token: '' },
        transports: ['polling', 'websocket'],
        forceNew: true,
        timeout: 2000,
      });

      await expect(waitForConnect(socket, 2000)).rejects.toThrow();
      socket.disconnect();
    });

    it('debería rechazar conexión con token inválido', async () => {
      const socket = createSocket('invalid-token-that-is-not-jwt');

      await expect(waitForConnect(socket, 2000)).rejects.toThrow();
      socket.disconnect();
    });

    it('debería rechazar conexión con token expirado/malformado', async () => {
      // Token JWT con formato válido pero firma incorrecta
      const fakeToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const socket = createSocket(fakeToken);

      await expect(waitForConnect(socket, 2000)).rejects.toThrow();
      socket.disconnect();
    });
  });

  describe('Connection Token Methods', () => {
    it('debería conectar con token en query param', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken, { method: 'query' });

      try {
        await waitForConnect(socket);
        expect(socket.connected).toBe(true);
      } finally {
        socket.disconnect();
      }
    });

    it('debería conectar con token en auth object', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken, { method: 'auth' });

      try {
        await waitForConnect(socket);
        expect(socket.connected).toBe(true);
      } finally {
        socket.disconnect();
      }
    });

    it('debería conectar con token en Authorization header', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken, { method: 'header' });

      try {
        await waitForConnect(socket);
        expect(socket.connected).toBe(true);
      } finally {
        socket.disconnect();
      }
    });
  });

  describe('Scanner Subscription', () => {
    it('debería poder suscribirse a un scan', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      try {
        await waitForConnect(socket);

        // Suscribirse a un scan
        const subscribePromise = waitForEvent<{
          scanId: string;
          message: string;
        }>(socket, 'scanner:subscribed');

        socket.emit('scanner:subscribe', { scanId: 'test-scan-123' });

        const response = await subscribePromise;
        expect(response.scanId).toBe('test-scan-123');
        expect(response.message).toContain('Successfully subscribed');
      } finally {
        socket.disconnect();
      }
    });

    it('debería poder desuscribirse de un scan', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      try {
        await waitForConnect(socket);

        // Primero suscribirse
        socket.emit('scanner:subscribe', { scanId: 'test-scan-456' });
        await waitForEvent(socket, 'scanner:subscribed');

        // Luego desuscribirse
        const unsubscribePromise = waitForEvent<{
          scanId: string;
          message: string;
        }>(socket, 'scanner:unsubscribed');

        socket.emit('scanner:unsubscribe', { scanId: 'test-scan-456' });

        const response = await unsubscribePromise;
        expect(response.scanId).toBe('test-scan-456');
        expect(response.message).toContain('Successfully unsubscribed');
      } finally {
        socket.disconnect();
      }
    });

    it('debería poder suscribirse a múltiples scans', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      try {
        await waitForConnect(socket);

        // Suscribirse a scan 1
        socket.emit('scanner:subscribe', { scanId: 'scan-1' });
        const response1 = await waitForEvent<{ scanId: string }>(
          socket,
          'scanner:subscribed',
        );
        expect(response1.scanId).toBe('scan-1');

        // Suscribirse a scan 2
        socket.emit('scanner:subscribe', { scanId: 'scan-2' });
        const response2 = await waitForEvent<{ scanId: string }>(
          socket,
          'scanner:subscribed',
        );
        expect(response2.scanId).toBe('scan-2');
      } finally {
        socket.disconnect();
      }
    });
  });

  describe('Scanner Admin Controls', () => {
    // TODO: These tests need a real running scan to control.
    // Currently they emit events to non-existent scans, so no response is received.
    // To fix: Create a scan first, then test pause/cancel/resume on it.
    it.skip('admin debería poder pausar un scan', async () => {
      const { accessToken } = await createAdminAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      try {
        await waitForConnect(socket);

        const pausePromise = waitForEvent<{ scanId: string; message: string }>(
          socket,
          'scanner:paused',
        );

        socket.emit('scanner:pause', { scanId: 'admin-scan-123' });

        const response = await pausePromise;
        expect(response.scanId).toBe('admin-scan-123');
        expect(response.message).toContain('paused successfully');
      } finally {
        socket.disconnect();
      }
    });

    it.skip('admin debería poder cancelar un scan', async () => {
      const { accessToken } = await createAdminAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      try {
        await waitForConnect(socket);

        const cancelPromise = waitForEvent<{
          scanId: string;
          reason: string;
          message: string;
        }>(socket, 'scanner:cancelled');

        socket.emit('scanner:cancel', {
          scanId: 'admin-scan-456',
          reason: 'Test cancellation',
        });

        const response = await cancelPromise;
        expect(response.scanId).toBe('admin-scan-456');
        expect(response.reason).toBe('Test cancellation');
        expect(response.message).toContain('cancelled successfully');
      } finally {
        socket.disconnect();
      }
    });

    it.skip('admin debería poder resumir un scan', async () => {
      const { accessToken } = await createAdminAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      try {
        await waitForConnect(socket);

        const resumePromise = waitForEvent<{ scanId: string; message: string }>(
          socket,
          'scanner:resumed',
        );

        socket.emit('scanner:resume', { scanId: 'admin-scan-789' });

        const response = await resumePromise;
        expect(response.scanId).toBe('admin-scan-789');
        expect(response.message).toContain('resumed successfully');
      } finally {
        socket.disconnect();
      }
    });

    it('usuario normal NO debería poder pausar un scan', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      try {
        await waitForConnect(socket);

        // Esperar error o excepción
        const errorPromise = waitForEvent<{ message: string }>(
          socket,
          'exception',
          2000,
        );

        socket.emit('scanner:pause', { scanId: 'user-scan-123' });

        const error = await errorPromise;
        expect(error.message).toContain('Unauthorized');
      } finally {
        socket.disconnect();
      }
    });

    it('usuario normal NO debería poder cancelar un scan', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      try {
        await waitForConnect(socket);

        const errorPromise = waitForEvent<{ message: string }>(
          socket,
          'exception',
          2000,
        );

        socket.emit('scanner:cancel', {
          scanId: 'user-scan-456',
          reason: 'Unauthorized attempt',
        });

        const error = await errorPromise;
        expect(error.message).toContain('Unauthorized');
      } finally {
        socket.disconnect();
      }
    });

    it('usuario normal NO debería poder resumir un scan', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      try {
        await waitForConnect(socket);

        const errorPromise = waitForEvent<{ message: string }>(
          socket,
          'exception',
          2000,
        );

        socket.emit('scanner:resume', { scanId: 'user-scan-789' });

        const error = await errorPromise;
        expect(error.message).toContain('Unauthorized');
      } finally {
        socket.disconnect();
      }
    });
  });

  describe('Reconnection', () => {
    it('debería manejar reconexión correctamente', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);

      // Primera conexión
      const socket1 = createSocket(accessToken);
      await waitForConnect(socket1);
      expect(socket1.connected).toBe(true);
      const firstId = socket1.id;
      socket1.disconnect();

      // Segunda conexión (simula reconexión)
      const socket2 = createSocket(accessToken);
      await waitForConnect(socket2);
      expect(socket2.connected).toBe(true);
      expect(socket2.id).not.toBe(firstId); // Nuevo ID tras reconexión

      socket2.disconnect();
    });

    it('debería mantener estado tras reconexión rápida', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      await waitForConnect(socket);

      // Suscribirse
      socket.emit('scanner:subscribe', { scanId: 'reconnect-test' });
      await waitForEvent(socket, 'scanner:subscribed');

      // Desconectar y reconectar
      socket.disconnect();

      const socket2 = createSocket(accessToken);
      await waitForConnect(socket2);

      // Debería poder suscribirse de nuevo
      socket2.emit('scanner:subscribe', { scanId: 'reconnect-test' });
      const response = await waitForEvent<{ scanId: string }>(
        socket2,
        'scanner:subscribed',
      );
      expect(response.scanId).toBe('reconnect-test');

      socket2.disconnect();
    });
  });

  describe('Error Handling', () => {
    it('debería manejar eventos inválidos gracefully', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      try {
        await waitForConnect(socket);

        // Enviar evento inexistente - no debería crashear
        socket.emit('nonexistent:event', { data: 'test' });

        // Verificar que el socket sigue conectado después
        await new Promise((resolve) => setTimeout(resolve, 500));
        expect(socket.connected).toBe(true);
      } finally {
        socket.disconnect();
      }
    });

    it('debería manejar payload inválido', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      try {
        await waitForConnect(socket);

        // Enviar payload inválido (sin scanId requerido)
        socket.emit('scanner:subscribe', {});

        // Esperar error de validación o que el socket siga conectado
        await new Promise((resolve) => setTimeout(resolve, 500));

        // El socket no debería crashear
        expect(socket.connected).toBe(true);
      } finally {
        socket.disconnect();
      }
    });

    it('debería manejar payload null/undefined', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      try {
        await waitForConnect(socket);

        // Enviar null
        socket.emit('scanner:subscribe', null);

        await new Promise((resolve) => setTimeout(resolve, 500));
        expect(socket.connected).toBe(true);
      } finally {
        socket.disconnect();
      }
    });
  });

  describe('Performance', () => {
    // TODO: Race condition - all waitForEvent listeners receive the same event
    // because events arrive faster than listeners are registered.
    // To fix: Use a different approach like collecting all events in an array.
    it.skip('debería manejar múltiples suscripciones rápidas', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      try {
        await waitForConnect(socket);

        const subscriptionPromises: Promise<{ scanId: string }>[] = [];

        // Suscribirse rápidamente a 10 scans
        for (let i = 0; i < 10; i++) {
          const promise = waitForEvent<{ scanId: string }>(
            socket,
            'scanner:subscribed',
            5000,
          );
          socket.emit('scanner:subscribe', { scanId: `rapid-scan-${i}` });
          subscriptionPromises.push(promise);
        }

        // Esperar todas las confirmaciones
        const results = await Promise.all(subscriptionPromises);
        expect(results.length).toBe(10);

        // Verificar que todos tienen scanId diferentes
        const scanIds = results.map((r) => r.scanId);
        const uniqueIds = new Set(scanIds);
        expect(uniqueIds.size).toBe(10);
      } finally {
        socket.disconnect();
      }
    });

    it('debería manejar conexiones concurrentes de múltiples usuarios', async () => {
      // Crear 5 usuarios
      const users = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          createUserAndLogin(drizzle, app, {
            username: `concurrent_user_${i}`,
            password: 'Test123!',
          }),
        ),
      );

      const sockets = users.map((u) => createSocket(u.accessToken));

      try {
        // Conectar todos simultáneamente
        await Promise.all(sockets.map((s) => waitForConnect(s)));

        // Verificar que todos están conectados
        sockets.forEach((s) => {
          expect(s.connected).toBe(true);
        });

        // Verificar que todos tienen IDs únicos
        const ids = sockets.map((s) => s.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(5);
      } finally {
        sockets.forEach((s) => s.disconnect());
      }
    });
  });

  describe('Cleanup on Disconnect', () => {
    it('debería limpiar suscripciones al desconectar', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);
      const socket = createSocket(accessToken);

      try {
        await waitForConnect(socket);

        // Suscribirse a un scan
        socket.emit('scanner:subscribe', { scanId: 'cleanup-scan' });
        await waitForEvent(socket, 'scanner:subscribed');

        // Desconectar
        socket.disconnect();

        // Esperar un momento
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Verificar que el socket está desconectado
        expect(socket.connected).toBe(false);
      } finally {
        if (socket.connected) {
          socket.disconnect();
        }
      }
    });

    it('debería permitir nueva suscripción después de desconexión', async () => {
      const { accessToken } = await createUserAndLogin(drizzle, app);

      // Primera conexión
      const socket1 = createSocket(accessToken);
      await waitForConnect(socket1);
      socket1.emit('scanner:subscribe', { scanId: 'resubscribe-scan' });
      await waitForEvent(socket1, 'scanner:subscribed');
      socket1.disconnect();

      // Segunda conexión
      const socket2 = createSocket(accessToken);
      await waitForConnect(socket2);

      // Debería poder suscribirse al mismo scan
      socket2.emit('scanner:subscribe', { scanId: 'resubscribe-scan' });
      const response = await waitForEvent<{ scanId: string }>(
        socket2,
        'scanner:subscribed',
      );
      expect(response.scanId).toBe('resubscribe-scan');

      socket2.disconnect();
    });
  });

  describe('User Isolation', () => {
    it('diferentes usuarios deberían tener sockets independientes', async () => {
      const { accessToken: token1 } = await createUserAndLogin(drizzle, app, {
        username: 'isolation_user1',
        password: 'Test123!',
      });
      const { accessToken: token2 } = await createUserAndLogin(drizzle, app, {
        username: 'isolation_user2',
        password: 'Test123!',
      });

      const socket1 = createSocket(token1);
      const socket2 = createSocket(token2);

      try {
        await Promise.all([waitForConnect(socket1), waitForConnect(socket2)]);

        // User1 se suscribe a scan-A
        socket1.emit('scanner:subscribe', { scanId: 'isolated-scan-A' });
        const response1 = await waitForEvent<{ scanId: string }>(
          socket1,
          'scanner:subscribed',
        );
        expect(response1.scanId).toBe('isolated-scan-A');

        // User2 se suscribe a scan-B
        socket2.emit('scanner:subscribe', { scanId: 'isolated-scan-B' });
        const response2 = await waitForEvent<{ scanId: string }>(
          socket2,
          'scanner:subscribed',
        );
        expect(response2.scanId).toBe('isolated-scan-B');

        // Ambas suscripciones son independientes
        expect(socket1.id).not.toBe(socket2.id);
      } finally {
        socket1.disconnect();
        socket2.disconnect();
      }
    });
  });
});
