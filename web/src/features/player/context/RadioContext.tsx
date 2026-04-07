/**
 * RadioContext — Estado y controles de radio.
 *
 * Solo se actualiza al cambiar de emisora o recibir metadatos.
 */

import { createContext, useContext } from 'react';
import type { RadioStation, RadioMetadata } from '../types';
import type { RadioBrowserStation } from '@shared/types/radio.types';

export interface RadioContextValue {
  currentRadioStation: RadioStation | null;
  isRadioMode: boolean;
  radioMetadata: RadioMetadata | null;
  radioSignalStatus: 'good' | 'weak' | 'error' | null;

  playRadio: (station: RadioStation | RadioBrowserStation) => void;
  stopRadio: () => void;
}

export const RadioContext = createContext<RadioContextValue | undefined>(undefined);

export function useRadio() {
  const context = useContext(RadioContext);
  if (!context) {
    throw new Error('useRadio must be used within a PlayerProvider');
  }
  return context;
}
