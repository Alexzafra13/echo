import { Link, useLocation } from 'wouter';
import {
  Home,
  Disc,
  User,
  ListMusic,
  Radio,
  Waves,
  Users,
  Shield,
} from 'lucide-react';
import { useAuthStore } from '@shared/store';
import { MiniPlayer } from '@features/player/components/MiniPlayer';
import { usePageEndDetection } from '@features/player/hooks/usePageEndDetection';
import styles from './Sidebar.module.css';

/**
 * Sidebar Component
 * Fixed sidebar navigation with Echo logo and navigation links
 */
export function Sidebar() {
  const [location] = useLocation();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.isAdmin === true;
  const isMiniMode = usePageEndDetection(120);

  const baseNavItems = [
    { icon: Home, label: 'Inicio', path: '/home' },
    { icon: Disc, label: 'Albums', path: '/albums' },
    { icon: User, label: 'Artists', path: '/artists' },
    { icon: ListMusic, label: 'Playlists', path: '/playlists' },
    { icon: Radio, label: 'Radio', path: '/radio' },
    { icon: Waves, label: 'Wave Mix', path: '/wave-mix' },
    { icon: Users, label: 'Social', path: '/social', hiddenOnMobile: true },
  ];

  const navItems = isAdmin
    ? [...baseNavItems, { icon: Shield, label: 'Admin', path: '/admin' }]
    : baseNavItems;

  const isActive = (path: string) => {
    // Direct match or starts with path
    if (location === path || location.startsWith(path + '/')) {
      return true;
    }
    // Federated album routes should highlight Albums
    if (path === '/albums' && location.startsWith('/federation/album/')) {
      return true;
    }
    return false;
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebar__logoContainer}>
        <img
          src="/images/logos/echo-icon-sidebar-white.png"
          alt="Echo"
          className={styles.sidebar__logo}
        />
      </div>

      <nav className={styles.sidebar__nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const itemClasses = [
            styles.sidebar__navItem,
            isActive(item.path) ? styles['sidebar__navItem--active'] : '',
            'hiddenOnMobile' in item && item.hiddenOnMobile ? styles['sidebar__navItem--hiddenMobile'] : '',
          ].filter(Boolean).join(' ');

          return (
            <Link
              key={item.path}
              href={item.path}
              className={itemClasses}
            >
              <Icon size={20} className={styles.sidebar__navIcon} />
              <span className={styles.sidebar__navLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <MiniPlayer isVisible={isMiniMode} />
    </aside>
  );
}
