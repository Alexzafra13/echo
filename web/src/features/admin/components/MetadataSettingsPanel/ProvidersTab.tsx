import { useState, useEffect } from 'react';
import { Check, X, AlertCircle, Key, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { Button, Input } from '@shared/components/ui';
import { apiClient } from '@shared/services/api';
import { logger } from '@shared/utils/logger';
import styles from './ProvidersTab.module.css';

interface Settings {
  autoEnrichEnabled: boolean;
  coverArtArchiveEnabled: boolean;
  lastfmEnabled: boolean;
  lastfmApiKey: string;
  fanarttvEnabled: boolean;
  fanarttvApiKey: string;
}

/**
 * ProvidersTab Component
 * Configuración de proveedores de metadata externos
 */
export function ProvidersTab() {
  const [settings, setSettings] = useState<Settings>({
    autoEnrichEnabled: false,
    coverArtArchiveEnabled: true,
    lastfmEnabled: false,
    lastfmApiKey: '',
    fanarttvEnabled: false,
    fanarttvApiKey: '',
  });

  const [lastfmKey, setLastfmKey] = useState('');
  const [fanarttvKey, setFanarttvKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [validating, setValidating] = useState<'lastfm' | 'fanarttv' | null>(null);
  const [validationStatus, setValidationStatus] = useState<{
    lastfm?: { valid: boolean; message: string };
    fanarttv?: { valid: boolean; message: string };
  }>({});
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/admin/settings');
      const data = response.data;

      // Convert array of settings to object
      const settingsMap: any = {};
      data.forEach((setting: any) => {
        settingsMap[setting.key] = setting.value;
      });

      const parsedSettings = {
        autoEnrichEnabled: settingsMap['metadata.auto_enrich.enabled'] === 'true',
        coverArtArchiveEnabled: true, // Always enabled
        lastfmEnabled: !!settingsMap['metadata.lastfm.api_key'],
        lastfmApiKey: settingsMap['metadata.lastfm.api_key'] || '',
        fanarttvEnabled: !!settingsMap['metadata.fanart.api_key'],
        fanarttvApiKey: settingsMap['metadata.fanart.api_key'] || '',
      };

      setSettings(parsedSettings);
      setLastfmKey(parsedSettings.lastfmApiKey);
      setFanarttvKey(parsedSettings.fanarttvApiKey);
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Error loading settings:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Validar API key de Last.fm
   */
  const validateLastfmKey = async (key: string) => {
    if (!key.trim()) {
      setValidationStatus((prev) => ({
        ...prev,
        lastfm: { valid: false, message: 'API key requerida' },
      }));
      return;
    }

    try {
      setValidating('lastfm');
      const response = await apiClient.post('/admin/settings/validate-api-key', {
        service: 'lastfm',
        apiKey: key,
      });

      setValidationStatus((prev) => ({
        ...prev,
        lastfm: { valid: response.data.valid, message: response.data.message },
      }));
    } catch (error: any) {
      setValidationStatus((prev) => ({
        ...prev,
        lastfm: { valid: false, message: error.response?.data?.message || 'Error al validar' },
      }));
    } finally {
      setValidating(null);
    }
  };

  /**
   * Validar API key de Fanart.tv
   */
  const validateFanarttvKey = async (key: string) => {
    if (!key.trim()) {
      setValidationStatus((prev) => ({
        ...prev,
        fanarttv: { valid: false, message: 'API key requerida' },
      }));
      return;
    }

    try {
      setValidating('fanarttv');
      const response = await apiClient.post('/admin/settings/validate-api-key', {
        service: 'fanart',
        apiKey: key,
      });

      setValidationStatus((prev) => ({
        ...prev,
        fanarttv: { valid: response.data.valid, message: response.data.message },
      }));
    } catch (error: any) {
      setValidationStatus((prev) => ({
        ...prev,
        fanarttv: { valid: false, message: error.response?.data?.message || 'Error al validar' },
      }));
    } finally {
      setValidating(null);
    }
  };

  /**
   * Guardar configuración
   */
  const saveSettings = async () => {
    try {
      setIsSaving(true);

      // Actualizar API keys
      if (lastfmKey !== settings.lastfmApiKey) {
        await apiClient.put('/admin/settings/metadata.lastfm.api_key', {
          value: lastfmKey,
        });
      }

      if (fanarttvKey !== settings.fanarttvApiKey) {
        await apiClient.put('/admin/settings/metadata.fanart.api_key', {
          value: fanarttvKey,
        });
      }

      // Actualizar auto-enrich
      await apiClient.put('/admin/settings/metadata.auto_enrich.enabled', {
        value: settings.autoEnrichEnabled.toString(),
      });

      // Recargar settings
      await loadSettings();

      setSaveMessage({ type: 'success', text: 'Configuración guardada correctamente' });
      // Clear message after 5 seconds
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        logger.error('Error saving settings:', error);
      }
      setSaveMessage({
        type: 'error',
        text: error.response?.data?.message || 'Error al guardar configuración'
      });
      // Clear message after 5 seconds
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Cargando configuración...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Auto-enrichment Toggle */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Auto-enrichment</h3>
          <p className={styles.sectionDescription}>
            Enriquece automáticamente artistas y álbumes después del escaneo
          </p>
        </div>

        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={settings.autoEnrichEnabled}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, autoEnrichEnabled: e.target.checked }))
            }
            className={styles.checkbox}
          />
          <span className={styles.toggleLabel}>
            Activar auto-enrichment post-scan
          </span>
        </label>
      </div>

      {/* Cover Art Archive */}
      <div className={styles.section}>
        <div className={styles.providerCard}>
          <div className={styles.providerHeader}>
            <Shield size={24} className={styles.providerIcon} />
            <div className={styles.providerInfo}>
              <h4 className={styles.providerName}>Cover Art Archive</h4>
              <p className={styles.providerDescription}>
                Portadas de álbumes de alta calidad (no requiere API key)
              </p>
            </div>
            <span className={styles.statusBadgeEnabled}>
              <Check size={16} />
              Activado
            </span>
          </div>
        </div>
      </div>

      {/* Last.fm */}
      <div className={styles.section}>
        <div className={styles.providerCard}>
          <div className={styles.providerHeader}>
            <Key size={24} className={styles.providerIcon} />
            <div className={styles.providerInfo}>
              <h4 className={styles.providerName}>Last.fm</h4>
              <p className={styles.providerDescription}>
                Biografías de artistas y álbumes
              </p>
            </div>
            {settings.lastfmEnabled && validationStatus.lastfm?.valid && (
              <span className={styles.statusBadgeEnabled}>
                <Check size={16} />
                Configurado
              </span>
            )}
          </div>

          <div className={styles.providerBody}>
            <Input
              type="text"
              value={lastfmKey}
              onChange={(e) => setLastfmKey(e.target.value)}
              placeholder="Ingresa tu API key de Last.fm"
              disabled={validating === 'lastfm'}
            />

            <div className={styles.providerActions}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => validateLastfmKey(lastfmKey)}
                loading={validating === 'lastfm'}
                disabled={!lastfmKey.trim()}
              >
                Validar API Key
              </Button>

              <a
                href="https://www.last.fm/api/account/create"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.providerLink}
              >
                Obtener API key →
              </a>
            </div>

            {validationStatus.lastfm && (
              <div
                className={`${styles.validationMessage} ${
                  validationStatus.lastfm.valid
                    ? styles.validationSuccess
                    : styles.validationError
                }`}
              >
                {validationStatus.lastfm.valid ? (
                  <Check size={16} />
                ) : (
                  <X size={16} />
                )}
                <span>{validationStatus.lastfm.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fanart.tv */}
      <div className={styles.section}>
        <div className={styles.providerCard}>
          <div className={styles.providerHeader}>
            <Key size={24} className={styles.providerIcon} />
            <div className={styles.providerInfo}>
              <h4 className={styles.providerName}>Fanart.tv</h4>
              <p className={styles.providerDescription}>
                Imágenes de artistas y portadas de álbumes
              </p>
            </div>
            {settings.fanarttvEnabled && validationStatus.fanarttv?.valid && (
              <span className={styles.statusBadgeEnabled}>
                <Check size={16} />
                Configurado
              </span>
            )}
          </div>

          <div className={styles.providerBody}>
            <Input
              type="text"
              value={fanarttvKey}
              onChange={(e) => setFanarttvKey(e.target.value)}
              placeholder="Ingresa tu API key de Fanart.tv"
              disabled={validating === 'fanarttv'}
            />

            <div className={styles.providerActions}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => validateFanarttvKey(fanarttvKey)}
                loading={validating === 'fanarttv'}
                disabled={!fanarttvKey.trim()}
              >
                Validar API Key
              </Button>

              <a
                href="https://fanart.tv/get-an-api-key/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.providerLink}
              >
                Obtener API key →
              </a>
            </div>

            {validationStatus.fanarttv && (
              <div
                className={`${styles.validationMessage} ${
                  validationStatus.fanarttv.valid
                    ? styles.validationSuccess
                    : styles.validationError
                }`}
              >
                {validationStatus.fanarttv.valid ? (
                  <Check size={16} />
                ) : (
                  <X size={16} />
                )}
                <span>{validationStatus.fanarttv.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className={styles.infoBox}>
        <AlertCircle size={20} className={styles.infoIcon} />
        <div className={styles.infoContent}>
          <p className={styles.infoTitle}>Sobre los proveedores:</p>
          <p className={styles.infoText}>
            Cover Art Archive está siempre activado y no requiere configuración.
            Last.fm y Fanart.tv requieren API keys gratuitas que puedes obtener creando una cuenta.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          onClick={saveSettings}
          loading={isSaving}
          disabled={isSaving}
        >
          Guardar Configuración
        </Button>

        {/* Save Message */}
        {saveMessage && (
          <div className={saveMessage.type === 'success' ? styles.saveSuccess : styles.saveError}>
            {saveMessage.type === 'success' ? (
              <CheckCircle2 size={18} />
            ) : (
              <XCircle size={18} />
            )}
            <span>{saveMessage.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
