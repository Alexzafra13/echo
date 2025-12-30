import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { logger } from '@shared/utils/logger';

/**
 * WebSocketService - Cliente WebSocket para conexión con el servidor
 *
 * Responsabilidades:
 * - Mantener conexión WebSocket con autenticación JWT
 * - Reconexión automática en caso de desconexión
 * - Gestión de namespaces (/scanner, /playback, etc.)
 * - Logging de conexiones y errores
 *
 * Uso:
 * const wsService = WebSocketService.getInstance();
 * const scannerSocket = wsService.connect('scanner', token);
 * scannerSocket.on('scan:progress', (data) => console.log(data));
 */
export class WebSocketService {
  private static instance: WebSocketService;
  private baseUrl: string;
  private sockets: Map<string, Socket> = new Map();

  private constructor() {
    // Base URL del servidor WebSocket
    // WebSocket connections go directly to the backend (not through Vite proxy)
    // because Socket.IO handles reconnection and transport fallback better
    //
    // Priority:
    // 1. VITE_WS_URL - explicit WebSocket URL
    // 2. VITE_API_URL - API URL (remove /api suffix)
    // 3. Development: http://localhost:3000 (direct to backend)
    // 4. Production: window.location.origin (same server serves both)
    if (import.meta.env.VITE_WS_URL) {
      this.baseUrl = import.meta.env.VITE_WS_URL;
    } else if (import.meta.env.VITE_API_URL) {
      this.baseUrl = import.meta.env.VITE_API_URL.replace(/\/api$/, '');
    } else if (import.meta.env.DEV) {
      // Development: connect directly to backend, bypass Vite proxy
      this.baseUrl = 'http://localhost:3000';
    } else {
      // Production: frontend and backend on same origin
      this.baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    }
  }

  /**
   * Obtener instancia singleton
   */
  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Conectar a un namespace específico
   *
   * @param namespace - Namespace del WebSocket (ej: 'scanner', 'playback')
   * @param token - JWT token para autenticación
   * @returns Socket conectado al namespace
   */
  connect(namespace: string, token: string): Socket {
    // Si ya existe una conexión activa, retornarla
    const existingSocket = this.sockets.get(namespace);
    if (existingSocket?.connected) {
      return existingSocket;
    }

    // Crear nueva conexión
    const socket = io(`${this.baseUrl}/${namespace}`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('error', (error: Error) => {
      if (import.meta.env.DEV) {
        logger.error(`[WebSocket] Error on /${namespace}:`, error);
      }
    });

    socket.on('connect_error', (error: Error) => {
      if (import.meta.env.DEV) {
        logger.error(`[WebSocket] Connection error on /${namespace}:`, error.message);
      }
    });

    // Guardar socket
    this.sockets.set(namespace, socket);

    return socket;
  }

  /**
   * Desconectar de un namespace
   */
  disconnect(namespace: string): void {
    const socket = this.sockets.get(namespace);

    if (socket) {
      socket.disconnect();
      this.sockets.delete(namespace);
    }
  }

  /**
   * Desconectar de todos los namespaces
   */
  disconnectAll(): void {
    this.sockets.forEach((socket) => {
      socket.disconnect();
    });
    this.sockets.clear();
  }

  /**
   * Obtener socket de un namespace si existe
   */
  getSocket(namespace: string): Socket | undefined {
    return this.sockets.get(namespace);
  }

  /**
   * Verificar si está conectado a un namespace
   */
  isConnected(namespace: string): boolean {
    const socket = this.getSocket(namespace);
    return socket?.connected || false;
  }
}

export default WebSocketService.getInstance();
