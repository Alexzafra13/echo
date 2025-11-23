import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Pagination Component
 * Elegant pagination with animated indicator and ellipsis for large page counts
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  className = ''
}: PaginationProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const pages = generatePageNumbers(currentPage, totalPages);

  // Update indicator position when current page changes
  useEffect(() => {
    if (!listRef.current) return;

    const currentButton = listRef.current.querySelector(`[aria-current="page"]`) as HTMLElement;
    if (currentButton) {
      // Calcular offset usando getBoundingClientRect para precisión
      const listRect = listRef.current.getBoundingClientRect();
      const buttonRect = currentButton.getBoundingClientRect();
      const offset = buttonRect.left - listRect.left;

      // Actualizar posición del indicador
      listRef.current.style.setProperty('--current-page-offset', offset.toString());

      // En mobile, centrar el botón actual con scrollIntoView
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        currentButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [currentPage]);

  const handlePageClick = (page: number) => {
    if (page !== currentPage && !disabled) {
      onPageChange(page);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1 && !disabled) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !disabled) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className={`${styles.pagination} ${className}`} aria-label="Paginación" data-ready="true">
      <ul ref={listRef} className={styles.pagination__list} role="list">
        {/* Previous Button */}
        <li className={styles.pagination__item}>
          <button
            onClick={handlePrevious}
            disabled={currentPage === 1 || disabled}
            className={`${styles.pagination__link} ${styles.pagination__link__arrow} ${
              (currentPage === 1 || disabled) ? styles.pagination__link__disabled : ''
            }`}
            aria-label="Anterior"
          >
            <ChevronLeft size={16} />
          </button>
        </li>

        {/* Page Numbers */}
        {pages.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <li key={`ellipsis-${index}`} className={`${styles.pagination__item} ${styles.pagination__gap}`}>
                <span className={styles.pagination__link__gap} aria-hidden="true">
                  …
                </span>
              </li>
            );
          }

          const pageNumber = page as number;
          const isActive = pageNumber === currentPage;

          return (
            <li key={pageNumber} className={styles.pagination__item}>
              <button
                onClick={() => handlePageClick(pageNumber)}
                disabled={disabled}
                className={`${styles.pagination__link} ${
                  isActive ? styles.pagination__link__current : ''
                }`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Página ${pageNumber}`}
              >
                {pageNumber}
              </button>
            </li>
          );
        })}

        {/* Next Button */}
        <li className={styles.pagination__item}>
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages || disabled}
            className={`${styles.pagination__link} ${styles.pagination__link__arrow} ${
              (currentPage === totalPages || disabled) ? styles.pagination__link__disabled : ''
            }`}
            aria-label="Siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </li>
      </ul>
    </nav>
  );
}

/**
 * Generate array of page numbers with ellipsis for display
 * Logic: Always show first, last, current, and pages around current
 */
function generatePageNumbers(
  current: number,
  total: number
): Array<number | 'ellipsis'> {
  const pages: Array<number | 'ellipsis'> = [];

  // If total pages <= 7, show all pages
  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Always show first page
  pages.push(1);

  // Calculate range around current page
  const leftBoundary = Math.max(2, current - 1);
  const rightBoundary = Math.min(total - 1, current + 1);

  // Add left ellipsis if needed
  if (leftBoundary > 2) {
    pages.push('ellipsis');
  }

  // Add pages around current
  for (let i = leftBoundary; i <= rightBoundary; i++) {
    pages.push(i);
  }

  // Add right ellipsis if needed
  if (rightBoundary < total - 1) {
    pages.push('ellipsis');
  }

  // Always show last page
  pages.push(total);

  return pages;
}
