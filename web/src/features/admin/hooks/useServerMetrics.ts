import { useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '@shared/store/authStore';
import { useSSE } from '@shared/hooks/useSSE';

export interface ServerMetrics {
  process: {
    uptimeSeconds: number;
    memoryUsage: {
      heapUsedMB: number;
      heapTotalMB: number;
      rssMB: number;
      externalMB: number;
      heapUsagePercent: number;
    };
    cpuUsage: {
      userMicros: number;
      systemMicros: number;
    };
    nodeVersion: string;
    pid: number;
  };
  system: {
    hostname: string;
    platform: string;
    arch: string;
    cpuCores: number;
    cpuModel: string;
    totalMemoryMB: number;
    freeMemoryMB: number;
    memoryUsagePercent: number;
    loadAverage: number[];
    uptimeSeconds: number;
    storage: {
      libraryPath: string;
      totalGB: number;
      freeGB: number;
      usedGB: number;
      usagePercent: number;
      status: 'ok' | 'warning' | 'critical';
    } | null;
  };
  streaming: {
    activeStreams: number;
    totalStreamsServed: number;
    activeStreamTokens: number;
  };
  queues: Array<{
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }>;
  database: {
    pool: {
      totalConnections: number;
      idleConnections: number;
      waitingRequests: number;
      maxConnections: number;
    };
  };
}

export function useServerMetrics() {
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const accessToken = useAuthStore((state) => state.accessToken);
  const apiUrl = import.meta.env.VITE_API_URL || '/api';

  const url = accessToken
    ? `${apiUrl}/admin/dashboard/server-metrics/stream?token=${encodeURIComponent(accessToken)}`
    : null;

  const events = useMemo(
    () => ({
      'server-metrics': (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as ServerMetrics;
          setMetrics(data);
        } catch {
          // Ignore parse errors
        }
      },
    }),
    []
  );

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  useSSE({
    url,
    label: 'ServerMetrics',
    events,
    onConnectionChange: handleConnectionChange,
  });

  return { metrics, isConnected };
}
