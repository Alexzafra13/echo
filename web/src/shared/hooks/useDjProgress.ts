import { useCallback, useMemo } from 'react';
import { useWebSocketConnection } from './useWebSocketConnection';
import { useDjProgressStore, type DjProgress } from '@shared/store/djProgressStore';

// Re-export the type for convenience
export type { DjProgress } from '@shared/store/djProgressStore';

/**
 * Hook global para escuchar el progreso de análisis DJ (BPM, Key, Energy)
 * Se conecta al WebSocket del scanner y recibe eventos dj:progress
 * Usa un store global para mantener el estado entre navegaciones
 *
 * @param token - JWT token para autenticación
 * @returns Estado del progreso DJ
 */
export function useDjProgress(token: string | null) {
  const djProgress = useDjProgressStore((state) => state.djProgress);
  const setDjProgress = useDjProgressStore((state) => state.setDjProgress);

  const handleDjProgress = useCallback((data: DjProgress) => {
    setDjProgress(data);
  }, [setDjProgress]);

  const events = useMemo(
    () => [
      { event: 'dj:progress', handler: handleDjProgress },
    ],
    [handleDjProgress]
  );

  const { isConnected } = useWebSocketConnection({
    namespace: 'scanner',
    token,
    enabled: !!token,
    events,
  });

  return {
    djProgress,
    isConnected,
  };
}
