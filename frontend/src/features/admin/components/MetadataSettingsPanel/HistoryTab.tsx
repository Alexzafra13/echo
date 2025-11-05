import { useState, useEffect } from 'react';
import { Music, Disc, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { apiClient } from '@shared/services/api';
import styles from './HistoryTab.module.css';

interface EnrichmentHistoryItem {
  id: string;
  entityType: 'artist' | 'album';
  entityId: string;
  entityName: string;
  status: 'success' | 'partial' | 'failed';
  bioUpdated: boolean;
  imagesUpdated: boolean;
  coverUpdated: boolean;
  errorMessage?: string;
  duration: number;
  timestamp: string;
}

/**
 * HistoryTab Component
 * Historial de enriquecimientos de metadata
 */
export function HistoryTab() {
  const [history, setHistory] = useState<EnrichmentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [page]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/admin/external-metadata/history', {
        params: { page, limit: 20 },
      });

      const newItems = response.data.items || [];

      if (page === 1) {
        setHistory(newItems);
      } else {
        setHistory((prev) => [...prev, ...newItems]);
      }

      setHasMore(newItems.length === 20);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    loadHistory();
  };

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} className={styles.statusIconSuccess} />;
      case 'partial':
        return <Clock size={20} className={styles.statusIconPartial} />;
      case 'failed':
        return <XCircle size={20} className={styles.statusIconError} />;
      default:
        return <Clock size={20} className={styles.statusIconPending} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Exitoso';
      case 'partial':
        return 'Parcial';
      case 'failed':
        return 'Fallido';
      default:
        return status;
    }
  };

  const getEntityIcon = (type: 'artist' | 'album') => {
    return type === 'artist' ? (
      <Music size={16} className={styles.entityIcon} />
    ) : (
      <Disc size={16} className={styles.entityIcon} />
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getUpdateSummary = (item: EnrichmentHistoryItem): string => {
    const updates: string[] = [];
    if (item.bioUpdated) updates.push('bio');
    if (item.imagesUpdated) updates.push('imágenes');
    if (item.coverUpdated) updates.push('portada');

    return updates.length > 0 ? updates.join(', ') : 'sin cambios';
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>Historial de Enriquecimientos</h3>
          <p className={styles.description}>
            Registro de todos los enriquecimientos de metadata realizados
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          loading={isLoading && page === 1}
          leftIcon={<RefreshCw size={16} />}
        >
          Actualizar
        </Button>
      </div>

      {/* History List */}
      {isLoading && page === 1 ? (
        <div className={styles.loading}>Cargando historial...</div>
      ) : history.length === 0 ? (
        <div className={styles.empty}>
          <Clock size={48} className={styles.emptyIcon} />
          <p className={styles.emptyText}>
            No hay enriquecimientos en el historial
          </p>
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {history.map((item) => (
              <div key={item.id} className={styles.item}>
                {/* Status Icon */}
                <div className={styles.itemStatus}>
                  {getStatusIcon(item.status)}
                </div>

                {/* Main Content */}
                <div className={styles.itemContent}>
                  <div className={styles.itemHeader}>
                    <div className={styles.itemTitle}>
                      {getEntityIcon(item.entityType)}
                      <span className={styles.itemName}>{item.entityName}</span>
                      <span className={styles.itemType}>
                        {item.entityType === 'artist' ? 'Artista' : 'Álbum'}
                      </span>
                    </div>
                    <span className={styles.itemDate}>
                      {formatDate(item.timestamp)}
                    </span>
                  </div>

                  <div className={styles.itemDetails}>
                    <span className={styles.itemStatus}>
                      {getStatusText(item.status)}
                    </span>
                    <span className={styles.itemDivider}>•</span>
                    <span className={styles.itemUpdates}>
                      {getUpdateSummary(item)}
                    </span>
                    <span className={styles.itemDivider}>•</span>
                    <span className={styles.itemDuration}>
                      {formatDuration(item.duration)}
                    </span>
                  </div>

                  {item.errorMessage && (
                    <div className={styles.itemError}>
                      <XCircle size={14} />
                      <span>{item.errorMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className={styles.loadMore}>
              <Button
                variant="outline"
                size="md"
                onClick={loadMore}
                loading={isLoading && page > 1}
                disabled={isLoading}
              >
                Cargar más
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
