import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { useStartImport, useCancelImport, useImports } from '../../hooks';
import { logger } from '@shared/utils/logger';

interface UseAlbumImportOptions {
  serverId: string;
  albumId: string;
  serverName?: string;
}

export function useAlbumImport({ serverId, albumId, serverName }: UseAlbumImportOptions) {
  const { t } = useTranslation();
  const [isImporting, setIsImporting] = useState(false);
  const [isImportedLocal, setIsImportedLocal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const startImport = useStartImport();
  const cancelImportMutation = useCancelImport();
  const { data: existingImports } = useImports();

  const existingImport = existingImports?.find(
    (imp) => imp.remoteAlbumId === albumId && imp.connectedServerId === serverId
  );
  const isCompleted = isImportedLocal || existingImport?.status === 'completed';
  const isInProgress =
    existingImport?.status === 'downloading' || existingImport?.status === 'pending';
  const isImported = isCompleted || isInProgress;

  const handleImport = async () => {
    if (!serverId || !albumId || isImporting || isImported) return;

    setImportError(null);
    setIsImporting(true);
    try {
      await startImport.mutateAsync({ serverId, remoteAlbumId: albumId });
      setIsImportedLocal(true);
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Failed to start import:', err);
      }

      let errorMessage = t('federation.errorImporting');

      if (err instanceof AxiosError && err.response) {
        const status = err.response.status;
        const data = err.response.data as { message?: string };

        if (status === 403 && data?.message?.includes('Download permission')) {
          errorMessage = t('federation.noDownloadPermission', { server: serverName || 'remoto' });
        } else if (status === 403) {
          errorMessage = t('federation.noImportPermission', {
            server: serverName || 'this server',
          });
        } else if (status === 404) {
          errorMessage = t('federation.albumNotAvailable');
        } else if (data?.message) {
          errorMessage = data.message;
        }
      }

      setImportError(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancelImport = async () => {
    if (!existingImport?.id || isCancelling) return;
    setIsCancelling(true);
    try {
      await cancelImportMutation.mutateAsync(existingImport.id);
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Failed to cancel import:', err);
      }
      setImportError(t('federation.errorCancelImport'));
    } finally {
      setIsCancelling(false);
    }
  };

  return {
    isImporting,
    isImported,
    isCompleted,
    isInProgress,
    isCancelling,
    importError,
    setImportError,
    handleImport,
    handleCancelImport,
  };
}
