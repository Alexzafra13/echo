import { IoAdapter } from '@nestjs/platform-socket.io';
import { Logger, INestApplicationContext } from '@nestjs/common';
import { ServerOptions, Server } from 'socket.io';
import { appConfig } from '@config/app.config';
import { SecuritySecretsService } from '@config/security-secrets.service';
import * as jwt from 'jsonwebtoken';

/**
 * WebSocketAdapter - Adaptador personalizado para Socket.IO
 *
 * Responsabilidades:
 * - Configurar Socket.IO con opciones personalizadas
 * - Habilitar CORS para conexiones WebSocket
 * - Configurar transports (websocket, polling)
 * - Autenticación JWT en el handshake (middleware)
 * - Logging de conexiones
 *
 * Uso:
 * const app = await NestFactory.create(AppModule);
 * app.useWebSocketAdapter(new WebSocketAdapter(app));
 */
export class WebSocketAdapter extends IoAdapter {
  private readonly logger = new Logger(WebSocketAdapter.name);
  private secretsService: SecuritySecretsService | null = null;

  constructor(private readonly appContext: INestApplicationContext) {
    super(appContext);
  }

  /**
   * Gets the JWT secret from SecuritySecretsService or falls back to env var
   */
  private getJwtSecret(): string | undefined {
    // Try to get from SecuritySecretsService (lazy initialization)
    if (!this.secretsService) {
      try {
        this.secretsService = this.appContext.get(SecuritySecretsService);
      } catch {
        // SecuritySecretsService not available, fall back to env var
        this.logger.debug('SecuritySecretsService not available, using env var');
      }
    }

    if (this.secretsService) {
      try {
        return this.secretsService.jwtSecret;
      } catch {
        // Service not initialized, fall back to env var
      }
    }

    return process.env.JWT_SECRET;
  }

  /**
   * Crea servidor de Socket.IO con configuración personalizada
   */
  createIOServer(port: number, options?: ServerOptions): Server {
    // In test/development mode, allow all origins for easier testing
    // In production, use configured CORS origins
    const isTestOrDev = process.env.NODE_ENV !== 'production';
    const corsOrigins = isTestOrDev ? true : appConfig.cors_origins;

    // Configuración del servidor Socket.IO
    const serverOptions: Partial<ServerOptions> = {
      ...options,
      cors: {
        origin: corsOrigins,
        credentials: true,
        methods: ['GET', 'POST'],
      },
      // Transports: polling primero para mejor compatibilidad, luego websocket
      transports: ['polling', 'websocket'],
      // Ping interval para mantener conexión viva
      pingInterval: 10000,
      pingTimeout: 5000,
      // Aumentar límite de listeners
      maxHttpBufferSize: 1e6, // 1MB
      // Habilitar compresión
      perMessageDeflate: {
        threshold: 1024, // Comprimir mensajes > 1KB
      },
    };

    const server: Server = super.createIOServer(port, serverOptions);

    // Middleware de autenticación JWT para el namespace /scanner
    const scannerNamespace = server.of('/scanner');
    scannerNamespace.use((socket, next) => {
      try {
        const token = this.extractToken(socket);

        if (!token) {
          this.logger.warn(`❌ WebSocket auth failed: No token provided`);
          return next(new Error('No token provided'));
        }

        const secret = this.getJwtSecret();
        if (!secret) {
          this.logger.error('❌ JWT_SECRET not configured');
          return next(new Error('Server configuration error'));
        }

        // Verificar token
        const payload = jwt.verify(token, secret) as jwt.JwtPayload;

        // Adjuntar usuario al socket
        socket.data.user = payload;
        socket.data.userId = payload.sub;

        this.logger.debug(`✅ WebSocket auth success: User ${payload.sub}`);
        next();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`❌ WebSocket auth failed: ${message}`);
        next(new Error('Unauthorized'));
      }
    });

    // Logging de conexiones
    server.on('connection', (socket) => {
      this.logger.log(`🔌 WebSocket client connected: ${socket.id}`);

      socket.on('disconnect', (reason: string) => {
        this.logger.log(`🔌 WebSocket client disconnected: ${socket.id} - ${reason}`);
      });

      socket.on('error', (error: Error) => {
        this.logger.error(`❌ WebSocket error on ${socket.id}:`, error);
      });
    });

    this.logger.log('✅ WebSocket server initialized with JWT middleware');
    return server;
  }

  /**
   * Extrae token JWT del handshake
   * Soporta: query param, auth object, Authorization header
   */
  private extractToken(socket: { handshake: { query?: { token?: string | string[] }; auth?: { token?: string }; headers?: { authorization?: string } } }): string | undefined {
    // 1. Desde query params: ?token=xxx
    if (socket.handshake.query?.token) {
      return Array.isArray(socket.handshake.query.token)
        ? socket.handshake.query.token[0]
        : socket.handshake.query.token;
    }

    // 2. Desde auth object: socket.connect({ auth: { token: 'xxx' } })
    if (socket.handshake.auth?.token) {
      return socket.handshake.auth.token;
    }

    // 3. Desde Authorization header: Bearer xxx
    const authHeader = socket.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }
}
