import { Bell } from 'lucide-react';
import { Switch } from '@shared/components/ui';
import { useNotificationPreferences, useUpdatePreference } from '@features/notifications';
import type { NotificationType } from '@features/notifications';
import styles from './SettingsPage.module.css';

const NOTIFICATION_ITEMS: { type: NotificationType; label: string; desc: string }[] = [
  { type: 'friend_request_received', label: 'Solicitudes de amistad', desc: 'Cuando alguien te envía una solicitud de amistad' },
  { type: 'friend_request_accepted', label: 'Amistad aceptada', desc: 'Cuando aceptan tu solicitud de amistad' },
  { type: 'scan_completed', label: 'Escaneo completado', desc: 'Cuando finaliza un escaneo de la biblioteca' },
  { type: 'enrichment_completed', label: 'Enriquecimiento completado', desc: 'Cuando finaliza el enriquecimiento de metadatos' },
  { type: 'new_content', label: 'Nuevo contenido', desc: 'Cuando se añade contenido nuevo a la biblioteca' },
];

export function NotificationsCard() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreference = useUpdatePreference();

  return (
    <div className={styles.settingsPage__card}>
      <div className={styles.settingsPage__cardHeader}>
        <h2><Bell size={20} /> Notificaciones</h2>
      </div>
      <div className={styles.settingsPage__cardBody}>
        {isLoading ? (
          <div className={styles.settingsPage__toggleItem}>
            <div className={styles.settingsPage__toggleInfo}>
              <p className={styles.settingsPage__toggleDescription}>Cargando preferencias...</p>
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
                  onChange={(checked) => updatePreference.mutate({ type: item.type, enabled: checked })}
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
