import { ErrorInfo } from 'react';
import './ErrorFallback.css';

interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

/**
 * Error Fallback UI
 *
 * Displays a user-friendly error message when the ErrorBoundary
 * catches an error.
 */
export function ErrorFallback({ error, errorInfo, onReset }: ErrorFallbackProps) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="error-fallback" role="alert">
      <div className="error-fallback__container">
        <div className="error-fallback__icon">⚠️</div>

        <h1 className="error-fallback__title">Algo salió mal</h1>

        <p className="error-fallback__message">
          La aplicación encontró un error inesperado. Por favor, intenta recargar la página.
        </p>

        <div className="error-fallback__actions">
          <button
            className="error-fallback__button error-fallback__button--primary"
            onClick={handleReload}
          >
            Recargar página
          </button>

          <button
            className="error-fallback__button error-fallback__button--secondary"
            onClick={onReset}
          >
            Intentar de nuevo
          </button>
        </div>

        {import.meta.env.DEV && (
          <details className="error-fallback__details">
            <summary className="error-fallback__details-summary">
              Detalles técnicos (solo en desarrollo)
            </summary>

            <div className="error-fallback__details-content">
              <div className="error-fallback__error">
                <strong>Error:</strong>
                <pre>{error.toString()}</pre>
              </div>

              {errorInfo && (
                <div className="error-fallback__stack">
                  <strong>Stack trace:</strong>
                  <pre>{errorInfo.componentStack}</pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
