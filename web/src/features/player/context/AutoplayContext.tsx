/**
 * AutoplayContext — Estado y configuración de autoplay.
 *
 * Se actualiza raramente: solo al activarse/desactivarse autoplay
 * o al cambiar su configuración.
 */

import { createContext, useContext } from 'react';
import type { AutoplaySettings } from '../types';

export interface AutoplayContextValue {
  autoplay: AutoplaySettings;
  isAutoplayActive: boolean;
  autoplaySourceArtist: string | null;
  setAutoplayEnabled: (enabled: boolean) => void;
}

export const AutoplayContext = createContext<AutoplayContextValue | undefined>(undefined);

export function useAutoplayContext() {
  const context = useContext(AutoplayContext);
  if (!context) {
    throw new Error('useAutoplayContext must be used within a PlayerProvider');
  }
  return context;
}
