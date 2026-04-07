import { Component, ErrorInfo, ReactNode } from 'react';
import i18next from 'i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui';
import { logger } from '@shared/utils/logger';
import styles from './FeatureErrorBoundary.module.css';

interface Props {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Error boundary a nivel de feature, permite fallos parciales sin crashear la app
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
    logger.error(`[${this.props.feature}] Error caught:`, error);
    logger.error(`[${this.props.feature}] Component stack:`, errorInfo.componentStack);
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.props.compact) {
        return (
          <div className={styles.compactError}>
            <AlertTriangle size={16} />
            <span>{i18next.t('errors.featureError', { feature: this.props.feature })}</span>
            <button onClick={this.handleReset} className={styles.retryButton}>
              <RefreshCw size={14} />
            </button>
          </div>
        );
      }

      return (
        <div className={styles.errorContainer}>
          <AlertTriangle size={32} className={styles.icon} />
          <h3 className={styles.title}>
            {i18next.t('errors.featureLoadError', { feature: this.props.feature })}
          </h3>
          <p className={styles.message}>{i18next.t('errors.featureErrorMessage')}</p>
          {import.meta.env.DEV && this.state.error && (
            <pre className={styles.errorDetails}>{this.state.error.message}</pre>
          )}
          <Button variant="secondary" onClick={this.handleReset} leftIcon={<RefreshCw size={16} />}>
            {i18next.t('common.retry')}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
