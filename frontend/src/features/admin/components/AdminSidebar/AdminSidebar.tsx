import {
  LayoutDashboard,
  Library,
  Music2,
  Wrench,
  Users,
  FileText,
  ChevronRight,
  Settings
} from 'lucide-react';
import styles from './AdminSidebar.module.css';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  subItems?: NavItem[];
}

/**
 * AdminSidebar Component
 * Navegación lateral jerárquica para el panel de administración
 */
export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
    },
    {
      id: 'library',
      label: 'Librería',
      icon: <Library size={20} />,
    },
    {
      id: 'metadata',
      label: 'Metadata',
      icon: <Music2 size={20} />,
    },
    {
      id: 'maintenance',
      label: 'Mantenimiento',
      icon: <Wrench size={20} />,
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: <Users size={20} />,
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: <FileText size={20} />,
    },
  ];

  const handleNavClick = (itemId: string) => {
    onTabChange(itemId);
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <Settings size={24} />
        <div>
          <h2 className={styles.title}>Admin</h2>
          <p className={styles.subtitle}>Panel de Control</p>
        </div>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <div key={item.id} className={styles.navGroup}>
            <button
              className={`${styles.navItem} ${activeTab === item.id ? styles['navItem--active'] : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <div className={styles.navItemLeft}>
                <div className={styles.navItemIcon}>{item.icon}</div>
                <span className={styles.navItemLabel}>{item.label}</span>
              </div>
              <div className={styles.navItemRight}>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={styles.navItemBadge}>{item.badge}</span>
                )}
                {item.subItems && <ChevronRight size={16} />}
              </div>
            </button>

            {/* Sub-items (for future expansion) */}
            {item.subItems && activeTab === item.id && (
              <div className={styles.subNav}>
                {item.subItems.map((subItem) => (
                  <button
                    key={subItem.id}
                    className={`${styles.subNavItem} ${activeTab === subItem.id ? styles['subNavItem--active'] : ''}`}
                    onClick={() => handleNavClick(subItem.id)}
                  >
                    <span className={styles.subNavItemLabel}>{subItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.footerInfo}>
          <span className={styles.footerLabel}>Echo Music Server</span>
          <span className={styles.footerVersion}>v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
