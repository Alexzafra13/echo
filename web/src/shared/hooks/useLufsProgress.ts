import { useCallback, useMemo } from 'react';
import { useWebSocketConnection } from './useWebSocketConnection';
import { useLufsProgressStore, type LufsProgress } from '@shared/store/lufsProgressStore';

// Re-export the type for convenience
export type { LufsProgress } from '@shared/store/lufsProgressStore';

/**
 * Hook global para escuchar el progreso de análisis LUFS
 * Se conecta al WebSocket del scanner y recibe eventos lufs:progress
 * Usa un store global para mantener el estado entre navegaciones
 *
 * @param token - JWT token para autenticación
 * @returns Estado del progreso LUFS
 */
export function useLufsProgress(token: string | null) {
  const lufsProgress = useLufsProgressStore((state) => state.lufsProgress);
  const setLufsProgress = useLufsProgressStore((state) => state.setLufsProgress);

  const handleLufsProgress = useCallback((data: LufsProgress) => {
    setLufsProgress(data);
  }, [setLufsProgress]);

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
