import { useSyncExternalStore } from 'react';

/**
 * Store externo para currentTime y duration del reproductor.
 *
 * Problema: currentTime se actualiza ~4 veces/segundo vía timeupdate del <audio>.
 * Si se usa useState en PlayerProvider, cada update provoca re-render de TODO
 * el árbol de contextos (30+ componentes suscritos a usePlayer()).
 *
 * Solución: Almacenar currentTime fuera de React. Solo los componentes que
 * realmente muestran el tiempo (ProgressBar, seek bar) se suscriben vía
 * useSyncExternalStore, que re-renderiza SOLO esos componentes.
 */

type Listener = () => void;

interface TimeState {
  currentTime: number;
  duration: number;
}

const listeners = new Set<Listener>();

let state: TimeState = {
  currentTime: 0,
  duration: 0,
};

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): TimeState {
  return state;
}

function getServerSnapshot(): TimeState {
  return { currentTime: 0, duration: 0 };
}

// ── Escritura (llamado desde PlayerProvider) ──

export function setCurrentTime(time: number): void {
  if (state.currentTime !== time) {
    state = { ...state, currentTime: time };
    emitChange();
  }
}

export function setDuration(dur: number): void {
  if (state.duration !== dur) {
    state = { ...state, duration: dur };
    emitChange();
  }
}

export function resetTime(): void {
  state = { currentTime: 0, duration: 0 };
  emitChange();
}

// ── Lectura síncrona (para refs, callbacks, hooks internos) ──

export function getCurrentTime(): number {
  return state.currentTime;
}

export function getDuration(): number {
  return state.duration;
}

// ── Hook React (solo re-renderiza los componentes suscritos) ──

export function useCurrentTime(): TimeState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
