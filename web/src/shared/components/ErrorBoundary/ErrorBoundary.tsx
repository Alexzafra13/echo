import { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const RELOAD_KEY = 'error-boundary-reload';

function isChunkLoadError(error: Error): boolean {
  const msg = error.message || '';
  return (
    msg.includes('Unable to preload CSS') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk')
  );
}

// Captura errores en el arbol de componentes y muestra un fallback
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('Error caught by ErrorBoundary:', error);
      console.error('Error info:', errorInfo);
    }

    // Auto-reload on stale asset errors (happens after redeploy when
    // the browser still has the old HTML cached with old asset hashes)
    if (isChunkLoadError(error)) {
      const lastReload = sessionStorage.getItem(RELOAD_KEY);
      const now = Date.now();
      // Only auto-reload once per minute to avoid infinite reload loops
      if (!lastReload || now - Number(lastReload) > 60_000) {
        sessionStorage.setItem(RELOAD_KEY, String(now));
        window.location.reload();
        return;
      }
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
