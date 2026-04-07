import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@shared/components/ui';
import { useNotificationPreferences, useUpdatePreference } from '@features/notifications';
import type { NotificationType } from '@features/notifications';
import styles from './SettingsPage.module.css';

export function NotificationsCard() {
  const { t } = useTranslation();
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreference = useUpdatePreference();

  const NOTIFICATION_ITEMS: { type: NotificationType; label: string; desc: string }[] = [
    {
      type: 'friend_request_received',
      label: t('settings.notifications.friendRequest'),
      desc: t('settings.notifications.friendRequestDesc'),
    },
    {
      type: 'friend_request_accepted',
      label: t('settings.notifications.friendAccepted'),
      desc: t('settings.notifications.friendAcceptedDesc'),
    },
    {
      type: 'scan_completed',
      label: t('settings.notifications.scanCompleted'),
      desc: t('settings.notifications.scanCompletedDesc'),
    },
    {
      type: 'enrichment_completed',
      label: t('settings.notifications.enrichmentCompleted'),
      desc: t('settings.notifications.enrichmentCompletedDesc'),
    },
    {
      type: 'new_content',
      label: t('settings.notifications.newContent'),
      desc: t('settings.notifications.newContentDesc'),
    },
  ];

  return (
    <div className={styles.settingsPage__card}>
      <div className={styles.settingsPage__cardHeader}>
        <h2>
          <Bell size={20} /> {t('settings.notifications.title')}
        </h2>
      </div>
      <div className={styles.settingsPage__cardBody}>
        {isLoading ? (
          <div className={styles.settingsPage__toggleItem}>
            <div className={styles.settingsPage__toggleInfo}>
              <p className={styles.settingsPage__toggleDescription}>
                {t('settings.notifications.loadingPreferences')}
              </p>
            </div>
          </div>
        ) : (
          NOTIFICATION_ITEMS.map((item) => {
            const pref = preferences?.find((p) => p.type === item.type);
            const isEnabled = pref ? pref.enabled : true;
            return (
              <div key={item.type} className={styles.settingsPage__toggleItem}>
                <div className={styles.settingsPage__toggleInfo}>
                  <span className={styles.settingsPage__toggleLabel}>{item.label}</span>
                  <p className={styles.settingsPage__toggleDescription}>{item.desc}</p>
                </div>
                <Switch
                  checked={isEnabled}
                  onChange={(checked) =>
                    updatePreference.mutate({ type: item.type, enabled: checked })
                  }
                  aria-label={item.label}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
