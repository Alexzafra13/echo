import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [location] = useLocation();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.isAdmin === true;
  const isMiniMode = usePageEndDetection(120);

  const baseNavItems = [
    { icon: Home, label: t('nav.home'), path: '/home' },
    { icon: Disc, label: t('nav.albums'), path: '/albums' },
    { icon: User, label: t('nav.artists'), path: '/artists' },
    { icon: ListMusic, label: t('nav.playlists'), path: '/playlists' },
    { icon: Radio, label: t('nav.radio'), path: '/radio' },
    { icon: Waves, label: t('nav.waveMix'), path: '/wave-mix' },
    { icon: Users, label: t('nav.social'), path: '/social', hiddenOnMobile: true },
  ];

  const navItems = isAdmin
    ? [...baseNavItems, { icon: Shield, label: t('nav.admin'), path: '/admin' }]
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
      <Link href="/home" className={styles.sidebar__logoContainer}>
        <img
          src="/images/logos/echo_dark.svg"
          alt="Echo"
          className={styles.sidebar__logo}
        />
      </Link>

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
