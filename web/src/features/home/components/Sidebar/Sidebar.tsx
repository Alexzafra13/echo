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

  // Animated indicator state
  const navRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);
  const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; height: number } | null>(null);
  const [canAnimate, setCanAnimate] = useState(false);

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

  // Find active path for indicator
  const activePath = navItems.find(item => isActive(item.path))?.path;

  // Calculate indicator position when active path changes
  useEffect(() => {
    if (!activePath || !navRef.current) return;

    // Query DOM directly - more reliable than ref callbacks
    const activeElement = navRef.current.querySelector(
      `[data-nav-path="${activePath}"]`
    ) as HTMLElement | null;

    if (activeElement) {
      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = activeElement.getBoundingClientRect();

      setIndicatorStyle({
        top: itemRect.top - navRect.top,
        height: itemRect.height,
      });

      // First render: enable animations after browser paints initial position
      if (isFirstRender.current) {
        isFirstRender.current = false;
        setTimeout(() => setCanAnimate(true), 50);
      }
    }
  }, [activePath, navItems.length]);

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
        {/* Animated sliding indicator - only render when position is calculated */}
        {indicatorStyle && (
          <div
            className={`${styles.sidebar__indicator} ${canAnimate ? styles['sidebar__indicator--animated'] : ''}`}
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
              data-nav-path={item.path}
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
