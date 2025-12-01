import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocketConnection } from './useWebSocketConnection';
import type { UseWebSocketConnectionOptions } from './useWebSocketConnection';

// Mock del WebSocketService
const mockSocket = {
  connected: false,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock('../services/websocket.service', () => ({
  default: {
    connect: vi.fn(() => mockSocket),
  },
}));

describe('useWebSocketConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return initial disconnected state', () => {
      const { result } = renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
        })
      );

      expect(result.current.isConnected).toBe(false);
      // Socket is assigned after useEffect runs, so it may be null or mockSocket
      expect(typeof result.current.emit).toBe('function');
      expect(typeof result.current.on).toBe('function');
      expect(typeof result.current.off).toBe('function');
    });

    it('should not connect when token is null', () => {
      const { result } = renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: null,
        })
      );

      expect(result.current.isConnected).toBe(false);
      expect(result.current.socket).toBe(null);
    });

    it('should not connect when enabled is false', () => {
      const { result } = renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
          enabled: false,
        })
      );

      expect(result.current.isConnected).toBe(false);
      expect(result.current.socket).toBe(null);
    });
  });

  describe('connection handling', () => {
    it('should register connect and disconnect handlers', () => {
      renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
        })
      );

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should call onConnect callback when connected', async () => {
      const onConnect = vi.fn();

      renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
          onConnect,
        })
      );

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];

      act(() => {
        connectHandler?.();
      });

      expect(onConnect).toHaveBeenCalledTimes(1);
    });

    it('should call onDisconnect callback when disconnected', () => {
      const onDisconnect = vi.fn();

      renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
          onDisconnect,
        })
      );

      // Simulate disconnection
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'disconnect'
      )?.[1];

      act(() => {
        disconnectHandler?.();
      });

      expect(onDisconnect).toHaveBeenCalledTimes(1);
    });

    it('should update isConnected state on connect', async () => {
      const { result } = renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
        })
      );

      expect(result.current.isConnected).toBe(false);

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];

      act(() => {
        connectHandler?.();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should set isConnected true if socket already connected', () => {
      mockSocket.connected = true;

      const { result } = renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
        })
      );

      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('event registration', () => {
    it('should register provided events on connection', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
          events: [
            { event: 'scan:progress', handler: handler1 },
            { event: 'scan:error', handler: handler2 },
          ],
        })
      );

      expect(mockSocket.on).toHaveBeenCalledWith('scan:progress', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('scan:error', expect.any(Function));
    });

    it('should unregister events on cleanup', () => {
      const handler = vi.fn();

      const { unmount } = renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
          events: [{ event: 'scan:progress', handler }],
        })
      );

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('scan:progress', expect.any(Function));
    });
  });

  describe('emit function', () => {
    it('should emit events when socket is connected', () => {
      mockSocket.connected = true;

      const { result } = renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
        })
      );

      act(() => {
        result.current.emit('test:event', { data: 'test' });
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('test:event', { data: 'test' });
    });

    it('should not emit events when socket is disconnected', () => {
      mockSocket.connected = false;

      const { result } = renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
        })
      );

      act(() => {
        result.current.emit('test:event', { data: 'test' });
      });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('on/off functions', () => {
    it('should register event listener with on()', () => {
      const { result } = renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
        })
      );

      const handler = vi.fn();

      act(() => {
        result.current.on('custom:event', handler);
      });

      expect(mockSocket.on).toHaveBeenCalledWith('custom:event', expect.any(Function));
    });

    it('should remove event listener with off()', () => {
      const { result } = renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
        })
      );

      const handler = vi.fn();

      act(() => {
        result.current.off('custom:event', handler);
      });

      expect(mockSocket.off).toHaveBeenCalledWith('custom:event', expect.any(Function));
    });
  });

  describe('namespace handling', () => {
    it('should connect to scanner namespace', async () => {
      const WebSocketService = await import('../services/websocket.service');

      renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
        })
      );

      expect(WebSocketService.default.connect).toHaveBeenCalledWith('scanner', 'test-token');
    });

    it('should connect to metadata namespace', async () => {
      const WebSocketService = await import('../services/websocket.service');

      renderHook(() =>
        useWebSocketConnection({
          namespace: 'metadata',
          token: 'test-token',
        })
      );

      expect(WebSocketService.default.connect).toHaveBeenCalledWith('metadata', 'test-token');
    });
  });

  describe('reconnection on token change', () => {
    it('should reconnect when token changes', async () => {
      const WebSocketService = await import('../services/websocket.service');

      const { rerender } = renderHook(
        (props: UseWebSocketConnectionOptions) => useWebSocketConnection(props),
        {
          initialProps: {
            namespace: 'scanner' as const,
            token: 'token-1',
          },
        }
      );

      expect(WebSocketService.default.connect).toHaveBeenCalledWith('scanner', 'token-1');

      rerender({
        namespace: 'scanner',
        token: 'token-2',
      });

      expect(WebSocketService.default.connect).toHaveBeenCalledWith('scanner', 'token-2');
    });
  });

  describe('error handling', () => {
    it('should handle connection errors gracefully', async () => {
      const WebSocketService = await import('../services/websocket.service');
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock connection error
      (WebSocketService.default.connect as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      const { result } = renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
        })
      );

      expect(result.current.isConnected).toBe(false);
      expect(result.current.socket).toBe(null);

      consoleError.mockRestore();
    });
  });

  describe('stability of returned functions', () => {
    it('should return stable emit function reference', () => {
      const { result, rerender } = renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
        })
      );

      const emit1 = result.current.emit;
      rerender();
      const emit2 = result.current.emit;

      expect(emit1).toBe(emit2);
    });

    it('should return stable on function reference', () => {
      const { result, rerender } = renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
        })
      );

      const on1 = result.current.on;
      rerender();
      const on2 = result.current.on;

      expect(on1).toBe(on2);
    });

    it('should return stable off function reference', () => {
      const { result, rerender } = renderHook(() =>
        useWebSocketConnection({
          namespace: 'scanner',
          token: 'test-token',
        })
      );

      const off1 = result.current.off;
      rerender();
      const off2 = result.current.off;

      expect(off1).toBe(off2);
    });
  });
});
