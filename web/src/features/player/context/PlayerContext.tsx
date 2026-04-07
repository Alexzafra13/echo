/**
 * Re-exports de los contextos granulares del player.
 *
 * Archivo mantenido para compatibilidad de imports existentes.
 * Los nuevos consumidores deben importar directamente desde los contextos granulares
 * o desde el barrel '@features/player'.
 */

export { PlayerProvider } from './PlayerProvider';

// Hooks granulares
export { useQueue } from './QueueContext';
export { usePlayback } from './PlaybackContext';
export { useRadio } from './RadioContext';
export { useAutoplayContext } from './AutoplayContext';
