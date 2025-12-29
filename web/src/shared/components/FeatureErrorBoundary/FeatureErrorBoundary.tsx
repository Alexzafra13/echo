import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui';
import { logger } from '@shared/utils/logger';
import styles from './FeatureErrorBoundary.module.css';

interface Props {
  /** Name of the feature for error reporting */
  feature: string;
  /** Children to render */
  children: ReactNode;
  /** Custom fallback UI (optional) */
  fallback?: ReactNode;
  /** Whether to show a compact error message */
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * FeatureErrorBoundary Component
 *
 * A specialized error boundary for feature-level error handling.
 * Unlike the global ErrorBoundary, this allows parts of the UI to fail
 * gracefully without crashing the entire application.
 *
 * @example
 * <FeatureErrorBoundary feature="album-grid">
 *   <AlbumGrid albums={albums} />
 * </FeatureErrorBoundary>
 *
 * @example
 * // With custom fallback
 * <FeatureErrorBoundary
 *   feature="recommendations"
 *   fallback={<p>Could not load recommendations</p>}
 * >
 *   <RecommendationsSection />
 * </FeatureErrorBoundary>
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error with feature context
    logger.error(`[${this.props.feature}] Error caught:`, error);
    logger.error(`[${this.props.feature}] Component stack:`, errorInfo.componentStack);

    // TODO: Send to error monitoring service (Sentry, etc.)
    // errorService.captureError(error, {
    //   feature: this.props.feature,
    //   componentStack: errorInfo.componentStack,
    // });
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Compact error message
      if (this.props.compact) {
        return (
          <div className={styles.compactError}>
            <AlertTriangle size={16} />
            <span>Error en {this.props.feature}</span>
            <button onClick={this.handleReset} className={styles.retryButton}>
              <RefreshCw size={14} />
            </button>
          </div>
        );
      }

      // Full error fallback
      return (
        <div className={styles.errorContainer}>
          <AlertTriangle size={32} className={styles.icon} />
          <h3 className={styles.title}>
            Error al cargar {this.props.feature}
          </h3>
          <p className={styles.message}>
            Ha ocurrido un error inesperado. Puedes intentar recargar esta sección.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className={styles.errorDetails}>
              {this.state.error.message}
            </pre>
          )}
          <Button
            variant="secondary"
            onClick={this.handleReset}
            leftIcon={<RefreshCw size={16} />}
          >
            Reintentar
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
