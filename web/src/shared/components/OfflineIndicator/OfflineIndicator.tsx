import { useEffect, useState, useCallback } from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@shared/services/api';
import styles from './OfflineIndicator.module.css';

/**
 * OfflineIndicator Component
 * Shows a subtle indicator in the header when the connection to the server is lost.
 *
 * Detection strategy (no polling):
 * 1. Browser online/offline events — instant network loss detection
 * 2. Axios response interceptor — detects server-down when real API calls fail
 * 3. Recovery check — when browser goes back online, verifies server is reachable
 */
export function OfflineIndicator() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const checkServer = useCallback(async () => {
    try {
      await apiClient.get('/health', { timeout: 5000 });
      setIsOffline(false);
    } catch {
      setIsOffline(true);
    }
  }, []);

  useEffect(() => {
    // 1. Browser events
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      // Browser says we're online, verify server is actually reachable
      checkServer();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Axios interceptor — detect server failures from real requests
    const interceptorId = apiClient.interceptors.response.use(
      (response) => {
        // Any successful response means we're connected
        if (isOffline) setIsOffline(false);
        return response;
      },
      (error) => {
        // Network error (no response) = server unreachable
        if (!error.response && error.code !== 'ERR_CANCELED') {
          setIsOffline(true);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      apiClient.interceptors.response.eject(interceptorId);
    };
  }, [isOffline, checkServer]);

  if (!isOffline) return null;

  return (
    <div
      className={styles.container}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={styles.indicator}>
        <WifiOff size={12} />
      </div>

      {showTooltip && (
        <div className={styles.tooltip}>
          {t('connection.offline', 'No connection to server')}
        </div>
      )}
    </div>
  );
}
