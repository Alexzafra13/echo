import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureErrorBoundary } from './FeatureErrorBoundary';

// Mock i18next
vi.mock('i18next', () => ({
  default: {
    t: (key: string, opts?: Record<string, string>) => {
      const map: Record<string, string> = {
        'errors.featureError': `Error en ${opts?.feature || 'feature'}`,
        'errors.featureLoadError': `No se pudo cargar ${opts?.feature || 'feature'}`,
        'errors.featureErrorMessage': 'Algo salió mal en esta sección',
        'common.retry': 'Reintentar',
      };
      return map[key] || key;
    },
  },
}));

// Mock logger
vi.mock('@shared/utils/logger', () => ({
  logger: { error: vi.fn() },
}));

// Mock UI components
vi.mock('../ui', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => <button onClick={onClick}>{children}</button>,
}));

// Suppress React error boundary console noise
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

// Component that throws on demand
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Feature broke');
  }
  return <div data-testid="feature-content">Feature works</div>;
}

describe('FeatureErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when no error', () => {
    render(
      <FeatureErrorBoundary feature="Player">
        <div data-testid="feature-content">Player works</div>
      </FeatureErrorBoundary>
    );

    expect(screen.getByTestId('feature-content')).toBeInTheDocument();
  });

  it('should render default error UI when child throws', () => {
    render(
      <FeatureErrorBoundary feature="Player">
        <ThrowingChild shouldThrow={true} />
      </FeatureErrorBoundary>
    );

    expect(screen.queryByTestId('feature-content')).not.toBeInTheDocument();
    expect(screen.getByText('No se pudo cargar Player')).toBeInTheDocument();
    expect(screen.getByText('Algo salió mal en esta sección')).toBeInTheDocument();
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    render(
      <FeatureErrorBoundary
        feature="Player"
        fallback={<div data-testid="custom-fallback">Custom error UI</div>}
      >
        <ThrowingChild shouldThrow={true} />
      </FeatureErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });

  it('should render compact error UI when compact prop is true', () => {
    render(
      <FeatureErrorBoundary feature="Queue" compact>
        <ThrowingChild shouldThrow={true} />
      </FeatureErrorBoundary>
    );

    expect(screen.getByText('Error en Queue')).toBeInTheDocument();
    // Should not show the full error UI
    expect(screen.queryByText('Algo salió mal en esta sección')).not.toBeInTheDocument();
  });

  it('should show retry button in default mode', () => {
    render(
      <FeatureErrorBoundary feature="Player">
        <ThrowingChild shouldThrow={true} />
      </FeatureErrorBoundary>
    );

    expect(screen.getByText('Reintentar')).toBeInTheDocument();
  });

  it('should show retry button in compact mode', () => {
    render(
      <FeatureErrorBoundary feature="Queue" compact>
        <ThrowingChild shouldThrow={true} />
      </FeatureErrorBoundary>
    );

    const retryButton = document.querySelector('[class*="retryButton"]');
    expect(retryButton).toBeInTheDocument();
  });

  it('should isolate errors - not crash the entire app', () => {
    // Render boundary inside a parent that also has content
    render(
      <div>
        <div data-testid="sibling">Sibling content</div>
        <FeatureErrorBoundary feature="BrokenFeature">
          <ThrowingChild shouldThrow={true} />
        </FeatureErrorBoundary>
      </div>
    );

    // Sibling should still be visible
    expect(screen.getByTestId('sibling')).toBeInTheDocument();
    // Broken feature shows error UI
    expect(screen.getByText('No se pudo cargar BrokenFeature')).toBeInTheDocument();
  });
});
