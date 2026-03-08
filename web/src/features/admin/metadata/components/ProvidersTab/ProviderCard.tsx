/**
 * Provider Card Component
 *
 * Displays a single metadata provider with its brand logo,
 * API key input, and validation controls.
 */

import { Check } from 'lucide-react';
import { Button, Input } from '@shared/components/ui';
import { ValidationMessage } from '../shared/ValidationMessage';
import styles from './ProviderCard.module.css';

export interface ProviderCardProps {
  /** Provider name (e.g., "Last.fm") */
  name: string;
  /** Provider description */
  description: string;
  /** Whether provider is currently enabled */
  enabled: boolean;
  /** Whether this provider requires an API key */
  requiresApiKey: boolean;
  /** Current API key value */
  apiKey?: string;
  /** Callback when API key changes */
  onApiKeyChange?: (key: string) => void;
  /** Callback when validate button is clicked */
  onValidate?: () => void;
  /** Validation result to display */
  validationResult?: { valid: boolean; message: string };
  /** Whether validation is in progress */
  isValidating?: boolean;
  /** URL to get API key (optional) */
  apiKeyUrl?: string;
  /** Path to provider logo SVG */
  logoPath?: string;
  /** Brand color hex (e.g., "#D51007") */
  brandColor?: string;
  /** Brand color RGB values (e.g., "213, 16, 7") */
  brandColorRgb?: string;
}

export function ProviderCard({
  name,
  description,
  enabled,
  requiresApiKey,
  apiKey = '',
  onApiKeyChange,
  onValidate,
  validationResult,
  isValidating = false,
  apiKeyUrl,
  logoPath,
  brandColor = '#8b5cf6',
  brandColorRgb = '139, 92, 246',
}: ProviderCardProps) {
  return (
    <div
      className={styles.providerCard}
      style={
        {
          '--provider-color': brandColor,
          '--provider-color-rgb': brandColorRgb,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <div className={styles.providerHeader}>
        {logoPath && (
          <div className={styles.logoContainer}>
            <img
              src={logoPath}
              alt={`${name} logo`}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const nameEl = e.currentTarget
                  .closest(`.${styles.providerHeader}`)
                  ?.querySelector(`.${styles.providerName}`) as HTMLElement;
                if (nameEl) nameEl.style.display = '';
              }}
            />
          </div>
        )}
        <div className={styles.providerInfo}>
          <h4
            className={styles.providerName}
            style={logoPath ? { display: 'none' } : undefined}
          >
            {name}
          </h4>
          <p className={styles.providerDescription}>{description}</p>
        </div>
        {!requiresApiKey && (
          <span className={styles.alwaysOnBadge}>
            <Check size={14} />
            Activo
          </span>
        )}
        {requiresApiKey && enabled && validationResult?.valid && (
          <span className={styles.statusBadge}>
            <Check size={14} />
            Configurado
          </span>
        )}
      </div>

      {/* API Key Input (if required) */}
      {requiresApiKey && (
        <div className={styles.providerBody}>
          <Input
            type="text"
            value={apiKey}
            onChange={(e) => onApiKeyChange?.(e.target.value)}
            placeholder={`Ingresa tu API key de ${name}`}
            disabled={isValidating}
          />

          <div className={styles.providerActions}>
            <Button
              variant="outline"
              size="sm"
              onClick={onValidate}
              loading={isValidating}
              disabled={!apiKey.trim() || isValidating}
            >
              {isValidating ? 'Validando...' : 'Validar API Key'}
            </Button>

            {apiKeyUrl && (
              <a
                href={apiKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.providerLink}
              >
                Obtener API key →
              </a>
            )}
          </div>

          {/* Validation Result */}
          {validationResult && (
            <ValidationMessage
              valid={validationResult.valid}
              message={validationResult.message}
            />
          )}
        </div>
      )}
    </div>
  );
}
