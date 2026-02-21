import { IoAdapter } from '@nestjs/platform-socket.io';
import { Logger, INestApplicationContext } from '@nestjs/common';
import { ServerOptions, Server } from 'socket.io';
import { appConfig } from '@config/app.config';
import { SecuritySecretsService } from '@config/security-secrets.service';
import * as jwt from 'jsonwebtoken';

export class WebSocketAdapter extends IoAdapter {
  private readonly logger = new Logger(WebSocketAdapter.name);
  private secretsService: SecuritySecretsService | null = null;

  constructor(private readonly appContext: INestApplicationContext) {
    super(appContext);
  }

  private getJwtSecret(): string | undefined {
    if (!this.secretsService) {
      try {
        this.secretsService = this.appContext.get(SecuritySecretsService);
      } catch {
        this.logger.debug('SecuritySecretsService not available, using env var');
      }
    }

    if (this.secretsService) {
      try {
        return this.secretsService.jwtSecret;
      } catch {
        // intentionally empty - fall through to env var
      }
    }

    return process.env.JWT_SECRET;
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const isTestOrDev = process.env.NODE_ENV !== 'production';
    const corsOrigins = isTestOrDev ? true : appConfig.cors_origins;

    const serverOptions: Partial<ServerOptions> = {
      ...options,
      cors: {
        origin: corsOrigins,
        credentials: true,
        methods: ['GET', 'POST'],
      },
      transports: ['polling', 'websocket'],
      pingInterval: 10000,
      pingTimeout: 5000,
      maxHttpBufferSize: 1e6,
      perMessageDeflate: {
        threshold: 1024,
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
  private extractToken(socket: {
    handshake: {
      query?: { token?: string | string[] };
      auth?: { token?: string };
      headers?: { authorization?: string };
    };
  }): string | undefined {
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
