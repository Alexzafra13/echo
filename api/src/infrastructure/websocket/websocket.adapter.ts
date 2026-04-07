import { IoAdapter } from '@nestjs/platform-socket.io';
import { Logger, INestApplicationContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ServerOptions, Server } from 'socket.io';
import { appConfig } from '@config/app.config';
import { SecuritySecretsService } from '@config/security-secrets.service';

export class WebSocketAdapter extends IoAdapter {
  private readonly logger = new Logger(WebSocketAdapter.name);
  private jwtService: JwtService | null = null;
  private jwtSecret: string | undefined;

  constructor(private readonly appContext: INestApplicationContext) {
    super(appContext);
  }

  private getJwtService(): JwtService | null {
    if (!this.jwtService) {
      try {
        this.jwtService = this.appContext.get(JwtService);
      } catch {
        this.logger.debug('JwtService not available');
      }
    }
    return this.jwtService;
  }

  private getJwtSecret(): string | undefined {
    if (this.jwtSecret) return this.jwtSecret;

    try {
      const secretsService = this.appContext.get(SecuritySecretsService);
      this.jwtSecret = secretsService.jwtSecret;
    } catch {
      this.jwtSecret = process.env.JWT_SECRET;
    }

    return this.jwtSecret;
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

    // JWT authentication middleware shared by all namespaces
    const jwtMiddleware = (
      socket: {
        handshake: {
          query?: { token?: string | string[] };
          auth?: { token?: string };
          headers?: { authorization?: string };
        };
        data: Record<string, unknown>;
      },
      next: (err?: Error) => void
    ) => {
      try {
        const token = this.extractToken(socket);

        if (!token) {
          this.logger.warn('WebSocket auth failed: No token provided');
          return next(new Error('No token provided'));
        }

        const svc = this.getJwtService();
        const secret = this.getJwtSecret();

        if (!svc && !secret) {
          this.logger.error('JWT_SECRET not configured');
          return next(new Error('Server configuration error'));
        }

        // Use JwtService if available (DI-managed), otherwise verify with raw secret
        const payload = svc
          ? svc.verify(token, { secret })
          : (() => {
              throw new Error('JwtService not available');
            })();

        socket.data.user = payload;
        socket.data.userId = payload.userId || payload.sub;

        this.logger.debug(`WebSocket auth success: User ${payload.userId || payload.sub}`);
        next();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`WebSocket auth failed: ${message}`);
        next(new Error('Unauthorized'));
      }
    };

    // Apply JWT auth to all namespaces
    server.use(jwtMiddleware);
    server.of('/scanner').use(jwtMiddleware);
    server.of('/listening-sessions').use(jwtMiddleware);

    server.on('connection', (socket) => {
      this.logger.log(`WebSocket client connected: ${socket.id}`);

      socket.on('disconnect', (reason: string) => {
        this.logger.log(`WebSocket client disconnected: ${socket.id} - ${reason}`);
      });

      socket.on('error', (error: Error) => {
        this.logger.error({ error: error.message, socketId: socket.id }, 'WebSocket error');
      });
    });

    this.logger.log('WebSocket server initialized with JWT middleware');
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
