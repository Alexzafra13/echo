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
  const isMiniMode = usePageEndDetection(120);

  // Animated indicator - same pattern as MetadataSettingsPanel
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 });
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

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

  const activePath = navItems.find(item => isActive(item.path))?.path;

  // Update indicator position
  useEffect(() => {
    if (!activePath) return;

    const updatePosition = () => {
      const activeItem = itemRefs.current.get(activePath);
      const navContainer = navRef.current;

      if (activeItem && navContainer) {
        const navRect = navContainer.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();

        setIndicatorStyle({
          top: itemRect.top - navRect.top,
          height: itemRect.height,
        });
      }
    };

    // Small delay to ensure refs are populated
    const timer = setTimeout(updatePosition, 10);
    return () => clearTimeout(timer);
  }, [activePath]);

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
        {/* Animated indicator */}
        <div
          className={styles.sidebar__indicator}
          style={{
            transform: `translateY(${indicatorStyle.top}px)`,
            height: `${indicatorStyle.height}px`,
          }}
        />

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              ref={(el: HTMLAnchorElement | null) => {
                if (el) itemRefs.current.set(item.path, el);
              }}
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
