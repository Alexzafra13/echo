import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getLibraryConfig,
  updateLibraryPath,
  browseDirectories,
  type LibraryConfig,
  type DirectoryInfo,
} from '../api/library.service';

interface BrowserState {
  currentPath: string;
  directories: DirectoryInfo[];
  parentPath: string | null;
}

export function useLibraryBrowser() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<LibraryConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showBrowser, setShowBrowser] = useState(false);
  const [browser, setBrowser] = useState<BrowserState>({
    currentPath: '/',
    directories: [],
    parentPath: null,
  });
  const [browsing, setBrowsing] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getLibraryConfig();
      setConfig(data);

      if (data.path) {
        setBrowser((prev) => ({ ...prev, currentPath: data.path }));
      } else if (data.mountedPaths.length > 0) {
        setBrowser((prev) => ({ ...prev, currentPath: data.mountedPaths[0] }));
      }
    } catch {
      setError(t('admin.library.errorLoadConfig'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleBrowse = useCallback(
    async (path: string) => {
      try {
        setBrowsing(true);
        const result = await browseDirectories(path);
        setBrowser({
          currentPath: result.currentPath,
          directories: result.directories,
          parentPath: result.parentPath,
        });
      } catch {
        setError(t('admin.library.errorBrowseDir'));
      } finally {
        setBrowsing(false);
      }
    },
    [t]
  );

  const handleSelectPath = useCallback(
    async (path: string) => {
      try {
        setSaving(true);
        setError(null);
        setSuccess(null);

        const result = await updateLibraryPath(path);

        if (result.success) {
          setSuccess(t('admin.library.pathUpdated', { count: result.fileCount }));
          setShowBrowser(false);
          await loadConfig();
        } else {
          setError(result.message);
        }
      } catch {
        setError(t('admin.library.errorSaveConfig'));
      } finally {
        setSaving(false);
      }
    },
    [loadConfig, t]
  );

  const openBrowser = useCallback(() => {
    setShowBrowser(true);
    handleBrowse(config?.path || '/');
  }, [config?.path, handleBrowse]);

  return {
    config,
    loading,
    saving,
    error,
    success,
    showBrowser,
    setShowBrowser,
    browser,
    browsing,
    handleBrowse,
    handleSelectPath,
    openBrowser,
  };
}
