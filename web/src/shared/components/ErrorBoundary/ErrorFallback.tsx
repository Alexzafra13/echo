import { ErrorInfo } from 'react';
import { useTranslation } from 'react-i18next';
import './ErrorFallback.css';

interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

export function ErrorFallback({ error, errorInfo, onReset }: ErrorFallbackProps) {
  const { t } = useTranslation();
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="error-fallback" role="alert">
      <div className="error-fallback__container">
        <div className="error-fallback__icon">⚠️</div>

        <h1 className="error-fallback__title">{t('errors.generic')}</h1>

        <p className="error-fallback__message">
          {t('errors.genericMessage')}
        </p>

        <div className="error-fallback__actions">
          <button
            className="error-fallback__button error-fallback__button--primary"
            onClick={handleReload}
          >
            {t('common.reload')}
          </button>

          <button
            className="error-fallback__button error-fallback__button--secondary"
            onClick={onReset}
          >
            {t('common.tryAgain')}
          </button>
        </div>

        {import.meta.env.DEV && (
          <details className="error-fallback__details">
            <summary className="error-fallback__details-summary">
              {t('errors.technicalDetails')}
            </summary>

            <div className="error-fallback__details-content">
              <div className="error-fallback__error">
                <strong>{t('errors.errorLabel')}</strong>
                <pre>{error.toString()}</pre>
              </div>

              {errorInfo && (
                <div className="error-fallback__stack">
                  <strong>{t('errors.stackTraceLabel')}</strong>
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
