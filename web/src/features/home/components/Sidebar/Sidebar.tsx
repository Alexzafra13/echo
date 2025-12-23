import { useState, useEffect, useRef, useCallback } from 'react';
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

  // Refs for animated indicator
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 });

  // Store ref callback
  const setItemRef = useCallback((path: string, element: HTMLAnchorElement | null) => {
    if (element) {
      itemRefs.current.set(path, element);
    } else {
      itemRefs.current.delete(path);
    }
  }, []);

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

  // Update indicator position when location changes
  useEffect(() => {
    if (!activePath || !navRef.current) return;

    const activeElement = itemRefs.current.get(activePath);
    const navContainer = navRef.current;

    if (activeElement && navContainer) {
      const navRect = navContainer.getBoundingClientRect();
      const itemRect = activeElement.getBoundingClientRect();

      setIndicatorStyle({
        top: itemRect.top - navRect.top,
        height: itemRect.height,
        opacity: 1,
      });
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
        {/* Animated sliding indicator */}
        <div
          className={styles.sidebar__indicator}
          style={{
            transform: `translateY(${indicatorStyle.top}px)`,
            height: indicatorStyle.height,
            opacity: indicatorStyle.opacity,
          }}
        />

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              ref={(el: HTMLAnchorElement | null) => setItemRef(item.path, el)}
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
