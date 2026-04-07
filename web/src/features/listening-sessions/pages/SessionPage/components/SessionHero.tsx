import { useTranslation } from 'react-i18next';
import { Copy, Check, Power, LogOut } from 'lucide-react';
import { listeningSessionsService } from '../../../services/listening-sessions.service';
import styles from '../SessionPage.module.css';

interface SessionHeroProps {
  session: { id: string; name: string; inviteCode: string; guestsCanControl?: boolean };
  isHost: boolean;
  participantCount: number;
  queueLength: number;
  heroTrackName?: string;
  heroCoverUrl?: string;
  copied: boolean;
  onCopyCode: () => void;
  onEnd: () => void;
  onLeave: () => void;
  isEndPending: boolean;
  isLeavePending: boolean;
  effectiveGuestsCanControl: boolean;
  onGuestsCanControlChange: (value: boolean) => void;
}

export function SessionHero({
  session,
  isHost,
  participantCount,
  queueLength,
  heroTrackName,
  heroCoverUrl,
  copied,
  onCopyCode,
  onEnd,
  onLeave,
  isEndPending,
  isLeavePending,
  effectiveGuestsCanControl,
  onGuestsCanControlChange,
}: SessionHeroProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.hero}>
      <div className={styles.heroInfo}>
        <span className={styles.heroLabel}>
          <span className={styles.heroDot} />
          {t('sessions.groupSession')}
        </span>
        <h1 className={styles.heroTitle}>{session.name}</h1>
        <div className={styles.heroMeta}>
          <span>
            {participantCount}{' '}
            {t('sessions.participantCount', { count: participantCount })}
          </span>
          <span className={styles.heroMetaDot}>·</span>
          <span>
            {queueLength} {t('sessions.inQueue')}
          </span>
          {heroTrackName && (
            <>
              <span className={styles.heroMetaDot}>·</span>
              <span className={styles.heroNowPlaying}>{heroTrackName}</span>
            </>
          )}
        </div>
        <div className={styles.heroActions}>
          <button className={styles.codeBtn} onClick={onCopyCode} type="button">
            <span className={styles.codeValue}>{session.inviteCode}</span>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          {isHost ? (
            <button
              className={styles.endBtn}
              onClick={onEnd}
              disabled={isEndPending}
              type="button"
            >
              <Power size={14} /> {t('sessions.end')}
            </button>
          ) : (
            <button
              className={styles.leaveBtn}
              onClick={onLeave}
              disabled={isLeavePending}
              type="button"
            >
              <LogOut size={14} /> {t('sessions.leave')}
            </button>
          )}
          {isHost && (
            <label className={styles.heroToggle}>
              <input
                type="checkbox"
                className={styles.toggle}
                checked={effectiveGuestsCanControl}
                onChange={async (e) => {
                  const newValue = e.target.checked;
                  onGuestsCanControlChange(newValue);
                  try {
                    await listeningSessionsService.updateSettings(session.id, {
                      guestsCanControl: newValue,
                    });
                  } catch {
                    onGuestsCanControlChange(!newValue);
                  }
                }}
              />
              <span className={styles.heroToggleText}>{t('sessions.guestControl')}</span>
            </label>
          )}
        </div>
      </div>
      {heroCoverUrl && (
        <div className={styles.heroCoverSide}>
          <img src={heroCoverUrl} alt="" className={styles.heroCoverImg} />
        </div>
      )}
    </div>
  );
}
