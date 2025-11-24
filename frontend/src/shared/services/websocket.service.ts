import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

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
    // Remover /api si existe, ya que WebSocket no usa el prefix /api
    // En producción (mismo origin): usar window.location.origin
    // En desarrollo: usar VITE_API_URL o fallback localhost:3000
    const apiUrl = import.meta.env.VITE_API_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    this.baseUrl = apiUrl.replace(/\/api$/, '');
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
    const key = `${namespace}`;

    // Si ya existe una conexión activa, retornarla
    if (this.sockets.has(key) && this.sockets.get(key)!.connected) {
      return this.sockets.get(key)!;
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
        console.error(`[WebSocket] Error on /${namespace}:`, error);
      }
    });

    socket.on('connect_error', (error: Error) => {
      if (import.meta.env.DEV) {
        console.error(`[WebSocket] Connection error on /${namespace}:`, error.message);
      }
    });

    // Guardar socket
    this.sockets.set(key, socket);

    return socket;
  }

  /**
   * Desconectar de un namespace
   */
  disconnect(namespace: string): void {
    const key = `${namespace}`;
    const socket = this.sockets.get(key);

    if (socket) {
      socket.disconnect();
      this.sockets.delete(key);
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
    const key = `${namespace}`;
    return this.sockets.get(key);
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
