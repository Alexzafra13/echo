import { useEffect, RefObject } from 'react';

/**
 * Hook para detectar clicks fuera de un elemento y ejecutar un callback
 * Útil para cerrar dropdowns, modales, menús, etc.
 *
 * @param ref - Referencia al elemento
 * @param callback - Función a ejecutar cuando se hace click fuera
 * @param isActive - Controla si el listener está activo (default: true)
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  callback: () => void,
  isActive: boolean = true
) {
  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback, isActive]);
}
