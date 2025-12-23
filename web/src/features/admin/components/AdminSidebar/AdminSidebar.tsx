import { MiniPlayer } from '@features/player/components/MiniPlayer';
import { usePageEndDetection } from '@features/player/hooks/usePageEndDetection';
import styles from './AdminSidebar.module.css';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: Tab[];
}

/**
 * AdminSidebar Component
 * Sidebar navigation for admin panel (bottom nav on mobile like Home sidebar)
 */
export function AdminSidebar({ activeTab, onTabChange, tabs }: AdminSidebarProps) {
  // Detectar cuando el usuario llega al final de la página para mostrar mini-player
  const isMiniMode = usePageEndDetection(120);

  const handleNavClick = (itemId: string) => {
    onTabChange(itemId);
  };

  return (
    <aside className={styles.sidebar}>
      {/* Logo - Same as main sidebar */}
      <div className={styles.sidebar__logoContainer}>
        <img
          src="/images/logos/echo-icon-sidebar-white.png"
          alt="Echo"
          className={styles.sidebar__logo}
        />
      </div>

      {/* Navigation */}
      <nav className={styles.sidebar__nav}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.sidebar__navItem} ${activeTab === tab.id ? styles['sidebar__navItem--active'] : ''}`}
            onClick={() => handleNavClick(tab.id)}
          >
            <div className={styles.sidebar__navIcon}>{tab.icon}</div>
            <span className={styles.sidebar__navLabel}>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Mini Player - se muestra al final de la página */}
      <MiniPlayer isVisible={isMiniMode} />
    </aside>
  );
}
