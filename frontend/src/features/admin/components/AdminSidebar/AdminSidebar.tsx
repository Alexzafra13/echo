import { Shield } from 'lucide-react';
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
  const handleNavClick = (itemId: string) => {
    onTabChange(itemId);
  };

  return (
    <aside className={styles.sidebar}>
      {/* Logo/Header - Hidden on mobile */}
      <div className={styles.sidebar__logoContainer}>
        <div className={styles.header}>
          <Shield size={24} />
          <div>
            <h2 className={styles.title}>Admin</h2>
            <p className={styles.subtitle}>Panel</p>
          </div>
        </div>
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
    </aside>
  );
}
