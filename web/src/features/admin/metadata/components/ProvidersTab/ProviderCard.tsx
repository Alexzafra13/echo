/**
 * Provider Card Component
 *
 * Presentational component for displaying a single metadata provider
 * with API key input and validation.
 */

import { Key, Check } from 'lucide-react';
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
}

/**
 * ProviderCard - Displays provider configuration
 *
 * @example
 * ```tsx
 * <ProviderCard
 *   name="Last.fm"
 *   description="Biografías de artistas y álbumes"
 *   enabled={true}
 *   requiresApiKey={true}
 *   apiKey={key}
 *   onApiKeyChange={setKey}
 *   onValidate={handleValidate}
 *   validationResult={result}
 *   apiKeyUrl="https://last.fm/api"
 * />
 * ```
 */
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
}: ProviderCardProps) {
  return (
    <div className={styles.providerCard}>
      {/* Header */}
      <div className={styles.providerHeader}>
        <Key size={24} className={styles.providerIcon} />
        <div className={styles.providerInfo}>
          <h4 className={styles.providerName}>{name}</h4>
          <p className={styles.providerDescription}>{description}</p>
        </div>
        {enabled && validationResult?.valid && (
          <span className={styles.statusBadge}>
            <Check size={16} />
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
