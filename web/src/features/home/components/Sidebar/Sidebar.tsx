import { useState, useEffect, useRef } from 'react';
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

  // Detectar cuando el usuario llega al final de la página para mostrar mini-player
  const isMiniMode = usePageEndDetection(120);

  // Animated indicator
  const navRef = useRef<HTMLElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; height: number } | null>(null);

  const baseNavItems = [
    { icon: Home, label: 'Inicio', path: '/home' },
    { icon: Disc, label: 'Albums', path: '/albums' },
    { icon: User, label: 'Artists', path: '/artists' },
    { icon: ListMusic, label: 'Playlists', path: '/playlists' },
    { icon: Radio, label: 'Radio', path: '/radio' },
    { icon: Waves, label: 'Wave Mix', path: '/wave-mix' },
    { icon: Users, label: 'Social', path: '/social' },
  ];

  // Add Admin item if user is admin
  const navItems = isAdmin
    ? [...baseNavItems, { icon: Shield, label: 'Admin', path: '/admin' }]
    : baseNavItems;

  const isActive = (path: string) => {
    return location === path || location.startsWith(path + '/');
  };

  // Find active index
  const activeIndex = navItems.findIndex(item => isActive(item.path));

  // Update indicator position - uses DOM query for reliability
  useEffect(() => {
    if (activeIndex === -1 || !navRef.current) return;

    const updatePosition = () => {
      if (!navRef.current) return;

      const links = navRef.current.querySelectorAll('a');
      const activeLink = links[activeIndex] as HTMLElement;

      if (activeLink) {
        const navRect = navRef.current.getBoundingClientRect();
        const linkRect = activeLink.getBoundingClientRect();

        setIndicatorStyle({
          top: linkRect.top - navRect.top,
          height: linkRect.height,
        });
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(updatePosition, 10);
    return () => clearTimeout(timer);
  }, [activeIndex, navItems.length]);

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.sidebar__logoContainer}>
        <img
          src="/images/logos/echo-icon-sidebar-white.png"
          alt="Echo"
          className={styles.sidebar__logo}
        />
      </div>

      {/* Navigation */}
      <nav className={styles.sidebar__nav} ref={navRef}>
        {/* Animated sliding indicator */}
        {indicatorStyle && (
          <div
            className={styles.sidebar__indicator}
            style={{
              transform: `translateY(${indicatorStyle.top}px)`,
              height: indicatorStyle.height,
            }}
          />
        )}

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

      {/* Mini Player - se muestra al final de la página */}
      <MiniPlayer isVisible={isMiniMode} />
    </aside>
  );
}
