import { useEffect, useRef } from 'react';
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
  const navRef = useRef<HTMLElement>(null);
  const isFirstUpdate = useRef(true);

  const baseNavItems = [
    { icon: Home, label: 'Inicio', path: '/home' },
    { icon: Disc, label: 'Albums', path: '/albums' },
    { icon: User, label: 'Artists', path: '/artists' },
    { icon: ListMusic, label: 'Playlists', path: '/playlists' },
    { icon: Radio, label: 'Radio', path: '/radio' },
    { icon: Waves, label: 'Wave Mix', path: '/wave-mix' },
    { icon: Users, label: 'Social', path: '/social' },
  ];

  const navItems = isAdmin
    ? [...baseNavItems, { icon: Shield, label: 'Admin', path: '/admin' }]
    : baseNavItems;

  const isActive = (path: string) => {
    return location === path || location.startsWith(path + '/');
  };

  const activeIndex = navItems.findIndex(item => isActive(item.path));

  // Update indicator position
  useEffect(() => {
    const nav = navRef.current;
    if (activeIndex === -1 || !nav) return;

    const links = nav.querySelectorAll('a');
    const activeLink = links[activeIndex] as HTMLElement;
    const indicator = nav.querySelector('[class*="sidebar__indicator"]') as HTMLElement;

    if (activeLink && indicator) {
      const navRect = nav.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      const newY = linkRect.top - navRect.top;
      const newHeight = linkRect.height;

      if (isFirstUpdate.current) {
        // First time: disable transition, set position, force reflow, re-enable
        indicator.style.transition = 'none';
        nav.style.setProperty('--indicator-y', `${newY}px`);
        nav.style.setProperty('--indicator-height', `${newHeight}px`);
        // Force reflow so the position is applied immediately
        void indicator.offsetHeight;
        // Re-enable transition
        indicator.style.transition = '';
        isFirstUpdate.current = false;
      } else {
        // Subsequent updates: just set position, CSS transition handles animation
        nav.style.setProperty('--indicator-y', `${newY}px`);
        nav.style.setProperty('--indicator-height', `${newHeight}px`);
      }
    }
  }, [activeIndex]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebar__logoContainer}>
        <img
          src="/images/logos/echo-icon-sidebar-white.png"
          alt="Echo"
          className={styles.sidebar__logo}
        />
      </div>

      <nav className={styles.sidebar__nav} ref={navRef}>
        {/* Indicator positioned via CSS custom properties */}
        <div className={styles.sidebar__indicator} />

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.sidebar__navItem} ${
                isActive(item.path) ? styles['sidebar__navItem--active'] : ''
              }`}
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
