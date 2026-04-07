import { useDjProgressListener } from '@shared/hooks';

/**
 * Global progress listeners component
 * Mounts WebSocket listeners for background progress events
 * Should be placed inside authenticated app context
 */
export function GlobalProgressListeners() {
  // Listen for DJ analysis progress events
  useDjProgressListener();

  // This component doesn't render anything
  return null;
}
