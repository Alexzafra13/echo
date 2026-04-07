import { useSessionStore } from '../../store/sessionStore';
import { useSessionSocket } from '../../hooks';

/**
 * Componente invisible que mantiene la conexion WebSocket
 * y la sincronizacion de reproduccion mientras haya sesion activa.
 * Se monta en App.tsx para que funcione desde cualquier pagina.
 */
export function SessionSync() {
  const sessionId = useSessionStore((s) => s.activeSession?.id ?? null);
  useSessionSocket(sessionId);
  return null;
}
