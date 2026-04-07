/**
 * Hook para gestionar la visibilidad del reproductor footer.
 * Controla cuando mostrar/ocultar segun preferencia del usuario,
 * viewport y posicion de scroll. Tambien gestiona el spacer del body.
 */

import { useEffect } from 'react';
import { usePageEndDetection } from './usePageEndDetection';
import { useIsMobile } from '@shared/hooks';
import type { PlayerPreference } from '../store';

interface UsePlayerVisibilityParams {
  hasContent: boolean;
  isNowPlayingOpen: boolean;
  preference: PlayerPreference;
}

export function usePlayerVisibility({
  hasContent,
  isNowPlayingOpen,
  preference,
}: UsePlayerVisibilityParams) {
  const isMiniMode = usePageEndDetection(120);

  const isMobile = useIsMobile();

  // Visibilidad segun preferencia, viewport y NowPlayingView
  const shouldHide = isNowPlayingOpen
    ? true
    : isMobile
      ? false
      : preference === 'footer'
        ? false
        : preference === 'sidebar'
          ? true
          : isMiniMode;

  // Spacer del footer segun contenido y preferencia
  useEffect(() => {
    const needsFooterSpacer = isMobile
      ? hasContent
      : hasContent && preference !== 'sidebar' && !(preference === 'dynamic' && isMiniMode);

    if (needsFooterSpacer) {
      document.body.classList.add('has-footer-player');
    } else {
      document.body.classList.remove('has-footer-player');
    }

    return () => {
      document.body.classList.remove('has-footer-player');
    };
  }, [hasContent, isMiniMode, preference, isMobile]);

  return { isMobile, isMiniMode, shouldHide };
}
