import { useSyncExternalStore } from 'react';

/**
 * Hook compartido para detectar viewport mobile.
 * Usa un unico resize listener global via useSyncExternalStore,
 * en lugar de registrar un listener por cada componente.
 */

const DEFAULT_BREAKPOINT = 768;

type Listener = () => void;
const listeners = new Set<Listener>();
let isMobile = typeof window !== 'undefined' ? window.innerWidth <= DEFAULT_BREAKPOINT : false;

function handleResize() {
  const next = window.innerWidth <= DEFAULT_BREAKPOINT;
  if (next !== isMobile) {
    isMobile = next;
    for (const listener of listeners) {
      listener();
    }
  }
}

// Un unico listener en window, registrado la primera vez que se usa
let listenerAttached = false;
function ensureListener() {
  if (!listenerAttached && typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
    listenerAttached = true;
  }
}

function subscribe(listener: Listener): () => void {
  ensureListener();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return isMobile;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
