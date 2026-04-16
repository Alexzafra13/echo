import { ChevronRight, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@shared/components/ui';
import styles from './SetupWizard.module.css';

interface Props {
  lastfm: string;
  fanart: string;
  savedHints?: { lastfm: string | null; fanart: string | null };
  onChange: (provider: 'lastfm' | 'fanart', value: string) => void;
  onSkip: () => void;
  onSave: (keys: { lastfm?: string; fanart?: string }) => Promise<void> | void;
  isSubmitting: boolean;
}

function formatHint(last4: string | null): string | undefined {
  if (!last4) return undefined;
  return `•••• •••• ${last4}`;
}

export function ApiKeysStep({
  lastfm,
  fanart,
  savedHints,
  onChange,
  onSkip,
  onSave,
  isSubmitting,
}: Props) {
  const { t } = useTranslation();

  const hasAny = lastfm.trim() !== '' || fanart.trim() !== '';

  const handleContinue = () => {
    if (!hasAny) {
      onSkip();
      return;
    }
    onSave({
      lastfm: lastfm.trim() || undefined,
      fanart: fanart.trim() || undefined,
    });
  };

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>
        <Key size={24} />
        {t('setup.apiKeysTitle')}
      </h2>
      <p className={styles.stepDescription}>{t('setup.apiKeysDescription')}</p>

      <div className={styles.providerList}>
        <ProviderRow
          name="Last.fm"
          logoPath="/images/providers/lastfm.svg"
          brandColor="#D51007"
          brandColorRgb="213, 16, 7"
          helpUrl="https://www.last.fm/api/account/create"
          placeholder={
            formatHint(savedHints?.lastfm ?? null) ?? t('setup.apiKeyPlaceholder')
          }
          savedHint={savedHints?.lastfm ?? null}
          value={lastfm}
          onChange={(v) => onChange('lastfm', v)}
          disabled={isSubmitting}
          description={t('setup.lastfmDescription')}
        />
        <ProviderRow
          name="Fanart.tv"
          logoPath="/images/providers/fanart.svg"
          brandColor="#1C94E0"
          brandColorRgb="28, 148, 224"
          helpUrl="https://fanart.tv/get-an-api-key"
          placeholder={
            formatHint(savedHints?.fanart ?? null) ?? t('setup.apiKeyPlaceholder')
          }
          savedHint={savedHints?.fanart ?? null}
          value={fanart}
          onChange={(v) => onChange('fanart', v)}
          disabled={isSubmitting}
          description={t('setup.fanartDescription')}
        />
      </div>

      <p className={styles.providerHint}>{t('setup.apiKeysHint')}</p>

      <div className={styles.actions}>
        <Button
          onClick={onSkip}
          variant="outline"
          size="lg"
          disabled={isSubmitting}
        >
          {t('setup.skipButton')}
        </Button>
        <Button
          onClick={handleContinue}
          variant="primary"
          size="lg"
          loading={isSubmitting}
          rightIcon={<ChevronRight size={20} />}
        >
          {hasAny ? t('setup.saveAndNextButton') : t('setup.nextButton')}
        </Button>
      </div>
    </div>
  );
}

interface ProviderRowProps {
  name: string;
  logoPath: string;
  brandColor: string;
  brandColorRgb: string;
  helpUrl: string;
  placeholder: string;
  savedHint: string | null;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  description: string;
}

function ProviderRow({
  name,
  logoPath,
  brandColor,
  brandColorRgb,
  helpUrl,
  placeholder,
  savedHint,
  value,
  onChange,
  disabled,
  description,
}: ProviderRowProps) {
  const { t } = useTranslation();
  return (
    <div
      className={styles.providerRow}
      style={
        {
          '--brand-color': brandColor,
          '--brand-color-rgb': brandColorRgb,
        } as React.CSSProperties
      }
    >
      <div className={styles.providerHeader}>
        <div className={styles.providerLogoBox}>
          <img src={logoPath} alt={name} className={styles.providerLogo} />
        </div>
        <div className={styles.providerMeta}>
          <span className={styles.providerName}>{name}</span>
          <span className={styles.providerDescription}>{description}</span>
        </div>
        <a
          href={helpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.providerHelp}
        >
          {t('setup.getKeyLink')}
        </a>
      </div>
      <input
        type="text"
        className={styles.providerInput}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
      />
      {savedHint && !value && (
        <span className={styles.providerSavedBadge}>{t('setup.apiKeySavedHint')}</span>
      )}
    </div>
  );
}
