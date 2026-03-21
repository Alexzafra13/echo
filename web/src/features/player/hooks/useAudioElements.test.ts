import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioElements } from './useAudioElements';

vi.mock('@shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock de HTMLAudioElement con propiedades escribibles
interface MockAudioElement extends HTMLAudioElement {
  _triggerEvent: (event: string, eventObj?: Event) => void;
  _setReadyState: (state: number) => void;
  readyState: number;
  duration: number;
}

function createMockAudio(): MockAudioElement {
  const eventListeners: Record<string, Set<EventListener>> = {};

  const mockAudio = {
    volume: 1,
    currentTime: 0,
    duration: 0,
    paused: true,
    src: '',
    readyState: 0,
    muted: false,
    ended: false,

    play: vi.fn().mockImplementation(function (this: typeof mockAudio) {
      this.paused = false;
      eventListeners['play']?.forEach((listener) => listener(new Event('play')));
      return Promise.resolve();
    }),

    pause: vi.fn().mockImplementation(function (this: typeof mockAudio) {
      this.paused = true;
      eventListeners['pause']?.forEach((listener) => listener(new Event('pause')));
    }),

    load: vi.fn(),

    addEventListener: vi.fn(
      (event: string, handler: EventListener, _options?: AddEventListenerOptions) => {
        if (!eventListeners[event]) {
          eventListeners[event] = new Set();
        }
        eventListeners[event].add(handler);
      }
    ),

    removeEventListener: vi.fn((event: string, handler: EventListener) => {
      eventListeners[event]?.delete(handler);
    }),

    _triggerEvent: (event: string, eventObj?: Event) => {
      eventListeners[event]?.forEach((listener) => {
        listener(eventObj || new Event(event));
      });
    },

    _setReadyState: function (state: number) {
      this.readyState = state;
      if (state >= 4) {
        this._triggerEvent('canplaythrough');
      }
    },
  } as unknown as MockAudioElement;

  return mockAudio;
}

describe('useAudioElements', () => {
  let mockAudioInstances: MockAudioElement[];
  let originalAudio: typeof Audio;

  // detectVolumeControl() crea un Audio extra al inicializar el hook.
  // Los 2 últimos siempre son los del hook (A y B).
  function audioA() { return mockAudioInstances[mockAudioInstances.length - 2]; }
  function audioB() { return mockAudioInstances[mockAudioInstances.length - 1]; }

  beforeEach(() => {
    mockAudioInstances = [];
    originalAudio = global.Audio;

    global.Audio = vi.fn().mockImplementation(() => {
      const mockAudio = createMockAudio();
      mockAudioInstances.push(mockAudio);
      return mockAudio;
    }) as unknown as typeof Audio;

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(performance.now() + 100);
      return 1;
    });

    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    global.Audio = originalAudio;
    vi.restoreAllMocks();
  });

  describe('inicialización', () => {
    it('crea dos elementos de audio', () => {
      const { result } = renderHook(() => useAudioElements());
      expect(result.current.getActiveAudio()).toBeTruthy();
      expect(result.current.getInactiveAudio()).toBeTruthy();
      expect(result.current.getActiveAudio()).not.toBe(result.current.getInactiveAudio());
    });

    it('aplica volumen inicial a ambos elementos', () => {
      renderHook(() => useAudioElements({ initialVolume: 0.5 }));
      expect(audioA().volume).toBe(0.5);
      expect(audioB().volume).toBe(0.5);
    });

    it('usa volumen 0.7 por defecto', () => {
      renderHook(() => useAudioElements());
      expect(audioA().volume).toBe(0.7);
      expect(audioB().volume).toBe(0.7);
    });

    it('empieza con audio A activo', () => {
      const { result } = renderHook(() => useAudioElements());
      expect(result.current.getActiveAudioId()).toBe('A');
    });
  });

  describe('getActiveAudio / getInactiveAudio', () => {
    it('devuelve audio A como activo inicialmente', () => {
      const { result } = renderHook(() => useAudioElements());
      expect(result.current.getActiveAudio()).toBe(audioA());
      expect(result.current.getInactiveAudio()).toBe(audioB());
    });

    it('intercambia tras switchActiveAudio', () => {
      const { result } = renderHook(() => useAudioElements());
      act(() => { result.current.switchActiveAudio(); });
      expect(result.current.getActiveAudio()).toBe(audioB());
      expect(result.current.getInactiveAudio()).toBe(audioA());
      expect(result.current.getActiveAudioId()).toBe('B');
    });
  });

  describe('switchActiveAudio', () => {
    it('alterna entre A y B', () => {
      const { result } = renderHook(() => useAudioElements());
      expect(result.current.getActiveAudioId()).toBe('A');

      act(() => { result.current.switchActiveAudio(); });
      expect(result.current.getActiveAudioId()).toBe('B');

      act(() => { result.current.switchActiveAudio(); });
      expect(result.current.getActiveAudioId()).toBe('A');
    });

    it('devuelve el nuevo id activo', () => {
      const { result } = renderHook(() => useAudioElements());
      let newId: 'A' | 'B';
      act(() => { newId = result.current.switchActiveAudio(); });
      expect(newId!).toBe('B');
    });
  });

  describe('resetToAudioA', () => {
    it('vuelve a audio A como activo', () => {
      const { result } = renderHook(() => useAudioElements());
      act(() => {
        result.current.switchActiveAudio();
        result.current.switchActiveAudio();
        result.current.switchActiveAudio();
      });
      expect(result.current.getActiveAudioId()).toBe('B');

      act(() => { result.current.resetToAudioA(); });
      expect(result.current.getActiveAudioId()).toBe('A');
    });
  });

  describe('setVolume', () => {
    it('cambia volumen en ambos elementos', () => {
      const { result } = renderHook(() => useAudioElements());
      act(() => { result.current.setVolume(0.3); });
      expect(audioA().volume).toBe(0.3);
      expect(audioB().volume).toBe(0.3);
      expect(result.current.volume).toBe(0.3);
    });
  });

  describe('setAudioVolume', () => {
    it('cambia volumen solo en el elemento indicado (A)', () => {
      const { result } = renderHook(() => useAudioElements());
      act(() => { result.current.setAudioVolume('A', 0.2); });
      expect(audioA().volume).toBe(0.2);
      expect(audioB().volume).toBe(0.7); // sin cambio
    });

    it('cambia volumen solo en el elemento indicado (B)', () => {
      const { result } = renderHook(() => useAudioElements());
      act(() => { result.current.setAudioVolume('B', 0.8); });
      expect(audioA().volume).toBe(0.7); // sin cambio
      expect(audioB().volume).toBe(0.8);
    });
  });

  describe('loadOnActive / loadOnInactive', () => {
    it('carga fuente en el audio activo', () => {
      const { result } = renderHook(() => useAudioElements());
      act(() => { result.current.loadOnActive('http://example.com/track.mp3'); });
      expect(audioA().src).toBe('http://example.com/track.mp3');
      expect(audioA().load).toHaveBeenCalled();
    });

    it('carga fuente en el audio inactivo con volumen 0', () => {
      const { result } = renderHook(() => useAudioElements());
      act(() => { result.current.loadOnInactive('http://example.com/next.mp3'); });
      expect(audioB().src).toBe('http://example.com/next.mp3');
      expect(audioB().volume).toBe(0);
      expect(audioB().load).toHaveBeenCalled();
    });
  });

  describe('playActive', () => {
    it('reproduce el audio activo', async () => {
      const { result } = renderHook(() => useAudioElements());
      audioA().readyState = 4;
      await act(async () => { await result.current.playActive(); });
      expect(audioA().play).toHaveBeenCalled();
    });

    it('espera buffer por defecto', async () => {
      const { result } = renderHook(() => useAudioElements());
      audioA().readyState = 2;
      setTimeout(() => { audioA()._setReadyState(4); }, 10);
      await act(async () => { await result.current.playActive(true); });
      expect(audioA().play).toHaveBeenCalled();
    });

    it('salta espera si waitForBuffer es false', async () => {
      const { result } = renderHook(() => useAudioElements());
      await act(async () => { await result.current.playActive(false); });
      expect(audioA().play).toHaveBeenCalled();
    });
  });

  describe('playInactive', () => {
    it('reproduce el audio inactivo y quita mute', async () => {
      const { result } = renderHook(() => useAudioElements());
      audioB().readyState = 4;
      audioB().muted = true;
      await act(async () => { await result.current.playInactive(); });
      expect(audioB().play).toHaveBeenCalled();
      expect(audioB().muted).toBe(false);
    });
  });

  describe('pauseActive / pauseBoth', () => {
    it('pausa el audio activo', () => {
      const { result } = renderHook(() => useAudioElements());
      act(() => { result.current.pauseActive(); });
      expect(audioA().pause).toHaveBeenCalled();
    });

    it('pausa ambos audios', () => {
      const { result } = renderHook(() => useAudioElements());
      act(() => { result.current.pauseBoth(); });
      expect(audioA().pause).toHaveBeenCalled();
      expect(audioB().pause).toHaveBeenCalled();
    });
  });

  describe('stopBoth', () => {
    it('para y limpia ambos elementos', async () => {
      const { result } = renderHook(() => useAudioElements());
      audioA().src = 'http://example.com/track1.mp3';
      audioB().src = 'http://example.com/track2.mp3';

      await act(async () => { await result.current.stopBoth(); });

      expect(audioA().pause).toHaveBeenCalled();
      expect(audioB().pause).toHaveBeenCalled();
      expect(audioA().src).toBe('');
      expect(audioB().src).toBe('');
      expect(audioA().currentTime).toBe(0);
      expect(audioB().currentTime).toBe(0);
    });

    it('vuelve a audio A como activo', async () => {
      const { result } = renderHook(() => useAudioElements());
      act(() => { result.current.switchActiveAudio(); });
      await act(async () => { await result.current.stopBoth(); });
      expect(result.current.getActiveAudioId()).toBe('A');
    });
  });

  describe('stopActive / stopInactive', () => {
    it('para y limpia el audio activo', async () => {
      const { result } = renderHook(() => useAudioElements());
      audioA().src = 'http://example.com/track.mp3';
      await act(async () => { await result.current.stopActive(); });
      expect(audioA().pause).toHaveBeenCalled();
      expect(audioA().src).toBe('');
    });

    it('para el inactivo sin limpiar src', async () => {
      const { result } = renderHook(() => useAudioElements());
      audioB().src = 'http://example.com/track.mp3';
      await act(async () => { await result.current.stopInactive(); });
      expect(audioB().pause).toHaveBeenCalled();
      expect(audioB().currentTime).toBe(0);
    });
  });

  describe('seek', () => {
    it('mueve la posición del audio activo', () => {
      const { result } = renderHook(() => useAudioElements());
      act(() => { result.current.seek(45.5); });
      expect(audioA().currentTime).toBe(45.5);
    });
  });

  describe('getCurrentTime / getDuration', () => {
    it('devuelve el tiempo actual del audio activo', () => {
      const { result } = renderHook(() => useAudioElements());
      audioA().currentTime = 30;
      expect(result.current.getCurrentTime()).toBe(30);
    });

    it('devuelve la duración del audio activo', () => {
      const { result } = renderHook(() => useAudioElements());
      audioA().duration = 180;
      expect(result.current.getDuration()).toBe(180);
    });
  });

  describe('areBothPaused', () => {
    it('true cuando ambos están pausados', () => {
      const { result } = renderHook(() => useAudioElements());
      audioA().paused = true;
      audioB().paused = true;
      expect(result.current.areBothPaused()).toBe(true);
    });

    it('false cuando uno está reproduciendo', () => {
      const { result } = renderHook(() => useAudioElements());
      audioA().paused = false;
      audioB().paused = true;
      expect(result.current.areBothPaused()).toBe(false);
    });
  });

  describe('callbacks', () => {
    it('dispara onPlay al reproducir', async () => {
      const onPlay = vi.fn();
      const { result } = renderHook(() => useAudioElements({ callbacks: { onPlay } }));
      audioA().readyState = 4;
      await act(async () => { await result.current.playActive(); });
      expect(onPlay).toHaveBeenCalled();
    });

    it('dispara onPause solo si ambos están pausados', () => {
      const onPause = vi.fn();
      renderHook(() => useAudioElements({ callbacks: { onPause } }));
      audioA().paused = true;
      audioB().paused = true;
      audioA()._triggerEvent('pause');
      expect(onPause).toHaveBeenCalled();
    });

    it('NO dispara onPause durante crossfade (uno sigue sonando)', () => {
      const onPause = vi.fn();
      renderHook(() => useAudioElements({ callbacks: { onPause } }));
      audioA().paused = true;
      audioB().paused = false;
      audioA()._triggerEvent('pause');
      expect(onPause).not.toHaveBeenCalled();
    });

    it('dispara onEnded cuando termina la pista', () => {
      const onEnded = vi.fn();
      renderHook(() => useAudioElements({ callbacks: { onEnded } }));
      audioA()._triggerEvent('ended');
      expect(onEnded).toHaveBeenCalled();
    });

    it('dispara onTimeUpdate solo para el audio activo', () => {
      const onTimeUpdate = vi.fn();
      renderHook(() => useAudioElements({ callbacks: { onTimeUpdate } }));
      audioA().currentTime = 15;
      audioA()._triggerEvent('timeupdate');
      expect(onTimeUpdate).toHaveBeenCalledWith(15);

      onTimeUpdate.mockClear();
      audioB().currentTime = 20;
      audioB()._triggerEvent('timeupdate');
      expect(onTimeUpdate).not.toHaveBeenCalled();
    });

    it('dispara onDurationChange solo para el audio activo', () => {
      const onDurationChange = vi.fn();
      renderHook(() => useAudioElements({ callbacks: { onDurationChange } }));
      audioA().duration = 200;
      audioA()._triggerEvent('loadedmetadata');
      expect(onDurationChange).toHaveBeenCalledWith(200);
    });

    it('dispara onError en error', () => {
      const onError = vi.fn();
      renderHook(() => useAudioElements({ callbacks: { onError } }));
      const errorEvent = new Event('error');
      audioA()._triggerEvent('error', errorEvent);
      expect(onError).toHaveBeenCalledWith(errorEvent);
    });

    it('dispara onWaiting en buffering', () => {
      const onWaiting = vi.fn();
      renderHook(() => useAudioElements({ callbacks: { onWaiting } }));
      audioA()._triggerEvent('waiting');
      expect(onWaiting).toHaveBeenCalled();
    });

    it('dispara onPlaying cuando continúa', () => {
      const onPlaying = vi.fn();
      renderHook(() => useAudioElements({ callbacks: { onPlaying } }));
      audioA()._triggerEvent('playing');
      expect(onPlaying).toHaveBeenCalled();
    });

    it('dispara onStalled cuando se atasca', () => {
      const onStalled = vi.fn();
      renderHook(() => useAudioElements({ callbacks: { onStalled } }));
      audioA()._triggerEvent('stalled');
      expect(onStalled).toHaveBeenCalled();
    });
  });

  describe('waitForAudioReady', () => {
    it('resuelve inmediatamente si readyState >= 4', async () => {
      const { result } = renderHook(() => useAudioElements());
      audioA().readyState = 4;
      let resolved = false;
      await act(async () => {
        resolved = await result.current.waitForAudioReady(audioA());
      });
      expect(resolved).toBe(true);
    });

    it('espera al evento canplaythrough', async () => {
      const { result } = renderHook(() => useAudioElements());
      audioA().readyState = 2;
      setTimeout(() => { audioA()._setReadyState(4); }, 10);
      let resolved = false;
      await act(async () => {
        resolved = await result.current.waitForAudioReady(audioA(), 1000);
      });
      expect(resolved).toBe(true);
    });

    it('resuelve true por timeout', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useAudioElements());
      audioA().readyState = 2;
      const promise = result.current.waitForAudioReady(audioA(), 100);
      await act(async () => { vi.advanceTimersByTime(150); });
      const resolved = await promise;
      expect(resolved).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('fadeOutAudio', () => {
    it('resuelve inmediatamente si el audio está pausado', async () => {
      const { result } = renderHook(() => useAudioElements());
      audioA().paused = true;
      await act(async () => {
        await result.current.fadeOutAudio(audioA(), 50);
      });
      expect(true).toBe(true);
    });

    it('resuelve inmediatamente si volumen ya es 0', async () => {
      const { result } = renderHook(() => useAudioElements());
      audioA().paused = false;
      audioA().volume = 0;
      await act(async () => {
        await result.current.fadeOutAudio(audioA(), 50);
      });
      expect(true).toBe(true);
    });

    it('reduce el volumen a 0', async () => {
      const { result } = renderHook(() => useAudioElements());
      audioA().paused = false;
      audioA().volume = 0.7;
      let time = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => {
        time += 100;
        return time;
      });
      await act(async () => {
        await result.current.fadeOutAudio(audioA(), 50);
      });
      expect(audioA().volume).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('limpia listeners y pausa audio al desmontar', () => {
      const { unmount } = renderHook(() => useAudioElements());
      unmount();
      expect(audioA().removeEventListener).toHaveBeenCalled();
      expect(audioB().removeEventListener).toHaveBeenCalled();
      expect(audioA().pause).toHaveBeenCalled();
      expect(audioB().pause).toHaveBeenCalled();
    });
  });

  describe('flujo de crossfade', () => {
    it('soporta el flujo completo de crossfade con volumen', async () => {
      const { result } = renderHook(() => useAudioElements({ initialVolume: 1 }));

      // 1. Cargar pista en activo (A)
      act(() => { result.current.loadOnActive('http://example.com/track1.mp3'); });
      expect(audioA().src).toBe('http://example.com/track1.mp3');

      // 2. Reproducir
      audioA().readyState = 4;
      await act(async () => { await result.current.playActive(); });
      expect(audioA().play).toHaveBeenCalled();

      // 3. Precargar siguiente en inactivo (B) — volumen a 0
      act(() => { result.current.loadOnInactive('http://example.com/track2.mp3'); });
      expect(audioB().src).toBe('http://example.com/track2.mp3');
      expect(audioB().volume).toBe(0);

      // 4. Iniciar crossfade — reproducir inactivo
      audioB().readyState = 4;
      await act(async () => { await result.current.playInactive(); });
      expect(audioB().play).toHaveBeenCalled();

      // 5. Ajustar volúmenes (punto medio del crossfade)
      act(() => {
        result.current.setAudioVolume('A', 0.5);
        result.current.setAudioVolume('B', 0.5);
      });
      expect(audioA().volume).toBe(0.5);
      expect(audioB().volume).toBe(0.5);

      // 6. Completar — intercambiar activo
      act(() => { result.current.switchActiveAudio(); });
      expect(result.current.getActiveAudioId()).toBe('B');

      // 7. Parar pista anterior
      await act(async () => { await result.current.stopInactive(); });
      expect(audioA().pause).toHaveBeenCalled();
    });
  });
});
