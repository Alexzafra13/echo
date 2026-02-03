import { useState, useEffect } from 'react';
import { Puzzle, Music2, RefreshCw, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { apiClient } from '@shared/services/api';
import styles from './PluginsPanel.module.css';

interface PluginInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'connected' | 'disconnected' | 'error' | 'installing' | 'not_installed';
  url: string;
  features: string[];
  error?: string;
  canInstall: boolean;
  containerStatus?: string;
  image: string;
}

interface PluginsResponse {
  plugins: PluginInfo[];
  dockerAvailable: boolean;
  dockerError: string | null;
}

interface ActionResponse {
  success: boolean;
  message: string;
}

/**
 * PluginsPanel Component
 * Panel para gestionar plugins de Echo
 */
export function PluginsPanel() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [dockerAvailable, setDockerAvailable] = useState(false);
  const [dockerError, setDockerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPlugins = async () => {
    try {
      const response = await apiClient.get<PluginsResponse>('/admin/plugins');
      setPlugins(response.data.plugins);
      setDockerAvailable(response.data.dockerAvailable);
      setDockerError(response.data.dockerError);
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
    setActionMessage(null);
    fetchPlugins();
  };

  const handleInstall = async (pluginId: string) => {
    setActionInProgress(pluginId);
    setActionMessage(null);

    try {
      const response = await apiClient.post<ActionResponse>(`/admin/plugins/${pluginId}/install`);

      if (response.data.success) {
        setActionMessage({ type: 'success', text: response.data.message });
        // Wait a bit for the container to start, then refresh
        setTimeout(() => fetchPlugins(), 3000);
      } else {
        setActionMessage({ type: 'error', text: response.data.message });
      }
    } catch (error) {
      setActionMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al instalar el plugin',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    if (!confirm('¿Estás seguro de que quieres desinstalar este plugin?')) {
      return;
    }

    setActionInProgress(pluginId);
    setActionMessage(null);

    try {
      const response = await apiClient.delete<ActionResponse>(`/admin/plugins/${pluginId}/uninstall`);

      if (response.data.success) {
        setActionMessage({ type: 'success', text: response.data.message });
        fetchPlugins();
      } else {
        setActionMessage({ type: 'error', text: response.data.message });
      }
    } catch (error) {
      setActionMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al desinstalar el plugin',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const getStatusLabel = (status: PluginInfo['status']) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'disconnected':
        return 'Desconectado';
      case 'error':
        return 'Error';
      case 'not_installed':
        return 'No instalado';
      case 'installing':
        return 'Instalando...';
      default:
        return status;
    }
  };

  const getStatusClass = (status: PluginInfo['status']) => {
    switch (status) {
      case 'connected':
        return styles.statusConnected;
      case 'error':
        return styles.statusError;
      case 'not_installed':
        return styles.statusNotInstalled;
      default:
        return styles.statusDisconnected;
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

      {actionMessage && (
        <div
          className={`${styles.actionMessage} ${
            actionMessage.type === 'success' ? styles.actionSuccess : styles.actionError
          }`}
        >
          {actionMessage.text}
        </div>
      )}

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
              <span className={`${styles.statusBadge} ${getStatusClass(plugin.status)}`}>
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

            {plugin.error && (
              <p className={styles.errorMessage}>{plugin.error}</p>
            )}

            <div className={styles.pluginFooter}>
              <span className={styles.pluginUrl}>{plugin.image}</span>

              <div className={styles.pluginActions}>
                {plugin.canInstall && (
                  <>
                    {(plugin.status === 'not_installed' || plugin.status === 'disconnected') && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleInstall(plugin.id)}
                        disabled={actionInProgress === plugin.id}
                      >
                        {actionInProgress === plugin.id ? (
                          <Loader2 size={16} className={styles.spinning} />
                        ) : (
                          <Download size={16} />
                        )}
                        {actionInProgress === plugin.id ? 'Instalando...' : 'Instalar'}
                      </Button>
                    )}

                    {(plugin.status === 'connected' || plugin.status === 'error') && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleUninstall(plugin.id)}
                        disabled={actionInProgress === plugin.id}
                      >
                        {actionInProgress === plugin.id ? (
                          <Loader2 size={16} className={styles.spinning} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                        Desinstalar
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!dockerAvailable && (
        <div className={styles.instructionsBox}>
          <h4 className={styles.instructionsTitle}>
            Docker no disponible
          </h4>
          {dockerError && (
            <p className={styles.errorMessage} style={{ marginBottom: '12px' }}>
              {dockerError}
            </p>
          )}
          {dockerError?.includes('permisos') ? (
            <>
              <p className={styles.instructionsText}>
                Para solucionar el problema de permisos, añade el grupo docker al contenedor:
              </p>
              <code className={styles.instructionsCode}>
{`services:
  echo:
    group_add:
      - "\${DOCKER_GID:-999}"`}
              </code>
              <p className={styles.instructionsText} style={{ marginTop: '12px' }}>
                Y ejecuta con la variable DOCKER_GID:
              </p>
              <code className={styles.instructionsCode}>
                DOCKER_GID=$(getent group docker | cut -d: -f3) docker compose up -d
              </code>
            </>
          ) : (
            <>
              <p className={styles.instructionsText}>
                Para habilitar la instalación desde la UI, monta el socket de Docker:
              </p>
              <code className={styles.instructionsCode}>
{`volumes:
  - /var/run/docker.sock:/var/run/docker.sock`}
              </code>
            </>
          )}
          <p className={styles.instructionsText} style={{ marginTop: '12px' }}>
            O instala manualmente con:
          </p>
          <code className={styles.instructionsCode}>
            docker compose --profile stems up -d
          </code>
        </div>
      )}
    </div>
  );
}
