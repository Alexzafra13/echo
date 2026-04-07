import { useState } from 'react';
import { Server, Edit3, Check, X, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useServerIdentity } from '../../hooks/useServerIdentity';
import { SERVER_COLORS, getServerColor } from './serverColors';
import styles from './ServerIdentityCard.module.css';

interface ServerIdentityCardProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function ServerIdentityCard({ onSuccess, onError }: ServerIdentityCardProps) {
  const { t } = useTranslation();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const { serverName, serverColor, isLoading, updateName, updateColor } = useServerIdentity();

  const handleStartEdit = () => {
    setEditedName(serverName);
    setIsEditingName(true);
  };
  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleSaveName = () => {
    if (!editedName.trim()) return;
    updateName.mutate(editedName.trim(), {
      onSuccess: () => {
        setIsEditingName(false);
        onSuccess(t('admin.federation.serverNameUpdated'));
      },
      onError: () => {
        onError(t('admin.federation.errorSavingName'));
      },
    });
  };

  const handleSaveColor = (color: string) => {
    updateColor.mutate(color, {
      onSuccess: () => {
        setShowColorPicker(false);
        onSuccess(t('admin.federation.serverColorUpdated'));
      },
      onError: () => {
        onError(t('admin.federation.errorSavingColor'));
      },
    });
  };

  const isSavingName = updateName.isPending;
  const isSavingColor = updateColor.isPending;

  return (
    <>
      <div
        className={`${styles.serverIdentityCard} ${showColorPicker ? styles.serverIdentityCardExpanded : ''}`}
        style={
          {
            '--server-color': getServerColor(serverColor).hex,
            '--server-color-rgb': getServerColor(serverColor).rgb,
          } as React.CSSProperties
        }
      >
        <div className={styles.serverIdentityIcon}>
          <Server size={24} />
        </div>
        <div className={styles.serverIdentityInfo}>
          <span className={styles.serverIdentityLabel}>
            {t('admin.federation.yourServerIdentity')}
          </span>
          {isLoading ? (
            <span className={styles.serverIdentityName}>{t('common.loading')}</span>
          ) : isEditingName ? (
            <div className={styles.serverNameEdit}>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className={styles.serverNameInput}
                placeholder={t('admin.federation.serverNamePlaceholder')}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <button
                className={styles.serverNameSaveBtn}
                onClick={handleSaveName}
                disabled={isSavingName || !editedName.trim()}
                title={t('common.save')}
              >
                <Check size={16} />
              </button>
              <button
                className={styles.serverNameCancelBtn}
                onClick={handleCancelEdit}
                disabled={isSavingName}
                title={t('common.cancel')}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className={styles.serverNameDisplay}>
              <span className={styles.serverIdentityName}>
                {serverName || t('admin.federation.noNameConfigured')}
              </span>
              <button
                className={styles.serverNameEditBtn}
                onClick={handleStartEdit}
                title={t('admin.federation.editName')}
              >
                <Edit3 size={14} />
              </button>
            </div>
          )}
        </div>
        <button
          className={styles.identityColorBtn}
          onClick={() => setShowColorPicker(!showColorPicker)}
          title={t('admin.federation.changeServerColor')}
          disabled={isSavingColor}
        >
          <Palette size={18} />
        </button>
      </div>

      {showColorPicker && (
        <div className={styles.identityColorPicker}>
          <span className={styles.identityColorLabel}>
            {t('admin.federation.colorDescription')}
          </span>
          <div className={styles.colorPicker}>
            {SERVER_COLORS.map((color) => (
              <button
                key={color.name}
                type="button"
                className={`${styles.colorSwatch} ${serverColor === color.name ? styles.colorSwatchActive : ''}`}
                style={
                  { '--swatch-color': color.hex, '--swatch-rgb': color.rgb } as React.CSSProperties
                }
                onClick={() => handleSaveColor(color.name)}
                disabled={isSavingColor}
                title={color.label}
                aria-label={color.label}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
