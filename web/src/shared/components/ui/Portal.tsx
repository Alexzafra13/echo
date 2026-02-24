import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
  containerId?: string;
}

/**
 * Portal Component
 * Renders children into a DOM node that exists outside the DOM hierarchy of the parent component
 * Useful for dropdowns, modals, tooltips that need to break out of overflow containers
 */
export function Portal({ children, containerId = 'portal-root' }: PortalProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Find or create the portal container
    let portalContainer = document.getElementById(containerId);

    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.id = containerId;
      portalContainer.style.position = 'fixed';
      portalContainer.style.top = '0';
      portalContainer.style.left = '0';
      portalContainer.style.width = '100%';
      portalContainer.style.height = '100%';
      portalContainer.style.pointerEvents = 'none';
      portalContainer.style.zIndex = '9510';
      document.body.appendChild(portalContainer);
    }

    setContainer(portalContainer);

    // Cleanup is handled by React - we don't remove the container
    // as it might be used by other portals
  }, [containerId]);

  if (!container) return null;

  return createPortal(children, container);
}
