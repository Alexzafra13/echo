import { useState, useEffect } from 'react';
import { Puzzle, Music2, RefreshCw } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { apiClient } from '@shared/services/api';
import styles from './PluginsPanel.module.css';

interface PluginInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'connected' | 'disconnected' | 'error';
  url: string;
  features: string[];
  error?: string;
}

interface PluginsResponse {
  plugins: PluginInfo[];
}

/**
 * PluginsPanel Component
 * Panel para gestionar plugins de Echo
 */
export function PluginsPanel() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPlugins = async () => {
    try {
      const response = await apiClient.get<PluginsResponse>('/admin/plugins');
      setPlugins(response.data.plugins);
    } catch (error) {
      console.error('Error fetching plugins:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPlugins();
  };

  const getStatusLabel = (status: PluginInfo['status']) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'disconnected':
        return 'Desconectado';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  };

  const getPluginIcon = (pluginId: string) => {
    switch (pluginId) {
      case 'stems':
        return <Music2 size={24} />;
      default:
        return <Puzzle size={24} />;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Plugins</h2>
          <p className={styles.description}>
            Gestiona los plugins opcionales de Echo. Los plugins extienden la funcionalidad
            del servidor con características adicionales como separación de stems.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
          Actualizar
        </Button>
      </div>

      <div className={styles.pluginsGrid}>
        {plugins.map((plugin) => (
          <div key={plugin.id} className={styles.pluginCard}>
            <div className={styles.pluginCardHeader}>
              <div className={styles.pluginIcon}>
                {getPluginIcon(plugin.id)}
              </div>
              <div className={styles.pluginInfo}>
                <h3 className={styles.pluginName}>{plugin.name}</h3>
                <span className={styles.pluginVersion}>v{plugin.version}</span>
              </div>
              <span
                className={`${styles.statusBadge} ${
                  plugin.status === 'connected'
                    ? styles.statusConnected
                    : plugin.status === 'error'
                    ? styles.statusError
                    : styles.statusDisconnected
                }`}
              >
                <span className={styles.statusDot} />
                {getStatusLabel(plugin.status)}
              </span>
            </div>

            <p className={styles.pluginDescription}>{plugin.description}</p>

            {plugin.features.length > 0 && (
              <div className={styles.featuresList}>
                {plugin.features.map((feature) => (
                  <span key={feature} className={styles.featureTag}>
                    {feature}
                  </span>
                ))}
              </div>
            )}

            <div className={styles.pluginFooter}>
              <span className={styles.pluginUrl}>{plugin.url}</span>
            </div>

            {plugin.error && (
              <p className={styles.errorMessage}>{plugin.error}</p>
            )}
          </div>
        ))}
      </div>

      {plugins.some((p) => p.status === 'disconnected') && (
        <div className={styles.instructionsBox}>
          <h4 className={styles.instructionsTitle}>
            Para activar el plugin de Stems:
          </h4>
          <code className={styles.instructionsCode}>
            docker compose --profile stems up -d
          </code>
        </div>
      )}
    </div>
  );
}
