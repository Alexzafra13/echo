import { useState, useCallback, useMemo } from 'react';
import { useWebSocketConnection } from './useWebSocketConnection';

/**
 * Progreso del análisis LUFS
 */
export interface LufsProgress {
  isRunning: boolean;
  pendingTracks: number;
  processedInSession: number;
  estimatedTimeRemaining: string | null;
}

/**
 * Hook global para escuchar el progreso de análisis LUFS
 * Se conecta al WebSocket del scanner y recibe eventos lufs:progress
 *
 * @param token - JWT token para autenticación
 * @returns Estado del progreso LUFS
 */
export function useLufsProgress(token: string | null) {
  const [lufsProgress, setLufsProgress] = useState<LufsProgress | null>(null);

  const handleLufsProgress = useCallback((data: LufsProgress) => {
    setLufsProgress(data);
  }, []);

  const events = useMemo(
    () => [
      { event: 'lufs:progress', handler: handleLufsProgress },
    ],
    [handleLufsProgress]
  );

  const { isConnected } = useWebSocketConnection({
    namespace: 'scanner',
    token,
    enabled: !!token,
    events,
  });

  return {
    lufsProgress,
    isConnected,
  };
}
