import { useState, useEffect } from 'react';

interface GridDimensionsConfig {
  maxRows?: number; // Número máximo de filas a calcular
  containerPadding?: number; // Padding del contenedor (por defecto desde CSS)
  headerHeight?: number; // Altura del header y otros elementos fijos
}

interface GridDimensions {
  columns: number;
  rows: number;
  itemsPerPage: number;
  minItemWidth: number;
  gap: number;
}

/**
 * Hook personalizado que calcula dinámicamente el número de columnas y filas
 * que caben en el viewport basándose en el tamaño de ventana y breakpoints CSS.
 *
 * Breakpoints sincronizados con AlbumGrid.module.css:
 * - Desktop (>1200px): minWidth 200px, gap 20px
 * - Tablet (768-1200px): minWidth 180px, gap 16px
 * - Mobile (480-768px): minWidth 140px, gap 12px
 * - Small Mobile (<480px): 2 columnas fijas, gap 10px
 */
export function useGridDimensions(config: GridDimensionsConfig = {}): GridDimensions {
  const { maxRows, containerPadding, headerHeight = 200 } = config;

  const [dimensions, setDimensions] = useState<GridDimensions>(() => {
    const dims = calculateDimensions(window.innerWidth, window.innerHeight, maxRows, containerPadding, headerHeight);
    console.log('🔷 useGridDimensions - Initial calculation:', {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      maxRows,
      headerHeight,
      result: dims
    });
    return dims;
  });

  useEffect(() => {
    const handleResize = () => {
      const newDimensions = calculateDimensions(
        window.innerWidth,
        window.innerHeight,
        maxRows,
        containerPadding,
        headerHeight
      );

      // Solo actualizar si realmente cambiaron las dimensiones
      if (
        newDimensions.columns !== dimensions.columns ||
        newDimensions.rows !== dimensions.rows
      ) {
        console.log('🔷 useGridDimensions - Resize detected:', {
          old: dimensions,
          new: newDimensions
        });
        setDimensions(newDimensions);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [maxRows, containerPadding, headerHeight, dimensions.columns, dimensions.rows]);

  console.log('🔷 useGridDimensions - Returning:', dimensions);
  return dimensions;
}

/**
 * Calcula las dimensiones del grid basándose en el tamaño de la ventana
 */
function calculateDimensions(
  windowWidth: number,
  windowHeight: number,
  maxRows?: number,
  customPadding?: number,
  headerHeight = 200
): GridDimensions {
  // Determinar breakpoint y configuración correspondiente
  const breakpoint = getBreakpoint(windowWidth);
  const { minItemWidth, gap, padding } = getBreakpointConfig(breakpoint, customPadding);

  // Calcular número de columnas
  const columns = calculateColumns(windowWidth, minItemWidth, gap, padding);

  // Calcular número de filas
  const rows = calculateRows(windowHeight, minItemWidth, gap, maxRows, headerHeight);

  const result = {
    columns,
    rows,
    itemsPerPage: columns * rows,
    minItemWidth,
    gap,
  };

  console.log('📐 calculateDimensions:', {
    breakpoint,
    windowWidth,
    windowHeight,
    minItemWidth,
    gap,
    padding,
    columns,
    rows,
    itemsPerPage: result.itemsPerPage,
    maxRows,
    headerHeight
  });

  return result;
}

/**
 * Determina el breakpoint actual basándose en el ancho de ventana
 */
function getBreakpoint(width: number): 'desktop' | 'tablet' | 'mobile' | 'small-mobile' {
  if (width < 480) return 'small-mobile';
  if (width < 768) return 'mobile';
  if (width < 1200) return 'tablet';
  return 'desktop';
}

/**
 * Obtiene la configuración de grid para cada breakpoint
 * Sincronizado con AlbumGrid.module.css
 */
function getBreakpointConfig(
  breakpoint: 'desktop' | 'tablet' | 'mobile' | 'small-mobile',
  customPadding?: number
) {
  const configs = {
    desktop: {
      minItemWidth: 200,
      gap: 20,
      padding: customPadding ?? 40, // 20px cada lado
    },
    tablet: {
      minItemWidth: 180,
      gap: 16,
      padding: customPadding ?? 40,
    },
    mobile: {
      minItemWidth: 140,
      gap: 12,
      padding: customPadding ?? 32, // 16px cada lado
    },
    'small-mobile': {
      minItemWidth: 0, // No se usa, columnas fijas
      gap: 10,
      padding: customPadding ?? 24, // 12px cada lado
    },
  };

  return configs[breakpoint];
}

/**
 * Calcula cuántas columnas caben en el ancho disponible
 */
function calculateColumns(
  windowWidth: number,
  minItemWidth: number,
  gap: number,
  padding: number
): number {
  // Calcular ancho del sidebar según breakpoints (sincronizado con Sidebar.module.css)
  let sidebarWidth = 200; // Desktop default
  if (windowWidth <= 1024 && windowWidth > 768) {
    sidebarWidth = 180; // Tablet
  } else if (windowWidth <= 768) {
    sidebarWidth = 80; // Mobile
  }

  // Small mobile siempre tiene 2 columnas fijas
  if (windowWidth < 480) return 2;

  // Ancho disponible para el grid (restando sidebar y padding lateral)
  const availableWidth = windowWidth - sidebarWidth - padding;

  console.log('📏 calculateColumns:', {
    windowWidth,
    sidebarWidth,
    padding,
    availableWidth,
    minItemWidth,
    gap
  });

  // Calcular columnas usando la misma lógica que auto-fill
  // Formula: (availableWidth + gap) / (minItemWidth + gap)
  const columns = Math.floor((availableWidth + gap) / (minItemWidth + gap));

  // Mínimo 1 columna, máximo razonable 8
  const finalColumns = Math.max(1, Math.min(columns, 8));

  console.log('📏 calculateColumns result:', finalColumns);

  return finalColumns;
}

/**
 * Calcula cuántas filas caben en el alto disponible
 */
function calculateRows(
  windowHeight: number,
  minItemWidth: number,
  gap: number,
  maxRows?: number,
  headerHeight = 200
): number {
  // Altura aproximada de cada item del grid
  // Card = imagen (aspect-ratio 1:1) + gap interno (12px) + título (~20px) + artista (~18px) + padding (16px)
  const titleHeight = 20; // Título con line-height
  const artistHeight = 18; // Artista con line-height
  const cardPadding = 16; // Padding vertical del card (8px top + 8px bottom)
  const cardInnerGap = 12; // Gap entre imagen y texto

  const itemHeight = minItemWidth + cardInnerGap + titleHeight + artistHeight + cardPadding;

  // Altura disponible para el grid (restando header, footer, margins, etc.)
  const footerHeight = 100; // Espacio para paginación/footer
  const margins = 80; // Márgenes adicionales
  const availableHeight = windowHeight - headerHeight - footerHeight - margins;

  // Calcular filas
  const rows = Math.floor((availableHeight + gap) / (itemHeight + gap));

  // Aplicar límites
  const minRowCount = 2;
  const maxRowCount = maxRows ?? 10;

  return Math.max(minRowCount, Math.min(rows, maxRowCount));
}
