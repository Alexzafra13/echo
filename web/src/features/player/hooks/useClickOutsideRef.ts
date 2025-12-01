import { useEffect, RefObject } from 'react';

/**
 * Hook simplificado para detectar clicks fuera de un elemento.
 * Versión que recibe un ref como parámetro (útil cuando el ref se pasa a componentes hijos).
 *
 * Para casos más avanzados (animaciones de cierre, ref auto-generado), usar
 * `useClickOutside` de `@shared/hooks`.
 *
 * @param ref - Referencia al elemento
 * @param callback - Función a ejecutar cuando se hace click fuera
 * @param isActive - Controla si el listener está activo (default: true)
 *
 * @example
 * ```tsx
 * const menuRef = useRef<HTMLDivElement>(null);
 * useClickOutsideRef(menuRef, () => setIsOpen(false), isOpen);
 * return <div ref={menuRef}>...</div>
 * ```
 */
export function useClickOutsideRef<T extends HTMLElement = HTMLElement>(
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
