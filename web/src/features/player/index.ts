// Provider (usado en main.tsx)
export { PlayerProvider } from './context/PlayerProvider';

// Hooks granulares (consumidores nuevos deben usar estos)
export { useQueue } from './context/QueueContext';
export { usePlayback } from './context/PlaybackContext';
export { useRadio } from './context/RadioContext';
export { useAutoplayContext } from './context/AutoplayContext';

// Granular context value types
export type { QueueContextValue } from './context/QueueContext';
export type { PlaybackContextValue } from './context/PlaybackContext';
export type { RadioContextValue } from './context/RadioContext';
export type { AutoplayContextValue } from './context/AutoplayContext';

export { AudioPlayer } from './components';
export { MiniPlayer } from './components/MiniPlayer';
export { useStreamToken } from './hooks/useStreamToken';
export { usePageEndDetection } from './hooks/usePageEndDetection';
export { usePlayerSettingsStore, type PlayerPreference } from './store';
export * from './types';
