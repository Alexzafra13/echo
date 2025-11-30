import { IoAdapter } from '@nestjs/platform-socket.io';
import { Logger } from '@nestjs/common';
import { ServerOptions } from 'socket.io';
import { appConfig } from '@config/app.config';

/**
 * WebSocketAdapter - Adaptador personalizado para Socket.IO
 *
 * Responsabilidades:
 * - Configurar Socket.IO con opciones personalizadas
 * - Habilitar CORS para conexiones WebSocket
 * - Configurar transports (websocket, polling)
 * - Logging de conexiones
 *
 * Uso:
 * const app = await NestFactory.create(AppModule);
 * app.useWebSocketAdapter(new WebSocketAdapter(app));
 */
export class WebSocketAdapter extends IoAdapter {
  private readonly logger = new Logger(WebSocketAdapter.name);

  /**
   * Crea servidor de Socket.IO con configuración personalizada
   */
  createIOServer(port: number, options?: ServerOptions): any {
    // Use same CORS config as HTTP (auto-detects IPs in production)
    const corsOrigins = appConfig.cors_origins;

    // Configuración del servidor Socket.IO
    const serverOptions: Partial<ServerOptions> = {
      ...options,
      cors: {
        origin: corsOrigins,
        credentials: true,
        methods: ['GET', 'POST'],
      },
      // Transports: websocket primero, polling como fallback
      transports: ['websocket', 'polling'],
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

    const server = super.createIOServer(port, serverOptions);

    // Logging de conexiones
    server.on('connection', (socket: any) => {
      this.logger.log(`🔌 WebSocket client connected: ${socket.id}`);

      socket.on('disconnect', (reason: string) => {
        this.logger.log(`🔌 WebSocket client disconnected: ${socket.id} - ${reason}`);
      });

      socket.on('error', (error: Error) => {
        this.logger.error(`❌ WebSocket error on ${socket.id}:`, error);
      });
    });

    this.logger.log('✅ WebSocket server initialized');
    return server;
  }
}
