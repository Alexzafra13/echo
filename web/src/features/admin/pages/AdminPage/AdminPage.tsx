import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearch } from 'wouter';
import { LayoutDashboard, Library, Music2, Wrench, Users, FileText, Server, Puzzle } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { AdminSidebar } from '../../components/AdminSidebar';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { DashboardPanel } from '../../components/DashboardPanel';
import { ScannerPanel } from '../../components/ScannerPanel/ScannerPanel';
import { LibraryPanel } from '../../components/LibraryPanel';
import { MetadataSettingsPanel } from '../../components/MetadataSettingsPanel';
import { MetadataConflictsPanel } from '../../components/MetadataConflictsPanel';
import { MaintenanceTab } from '../../components/MetadataSettingsPanel/MaintenanceTab';
import { UsersPanel } from '../../components/UsersPanel';
import { LogsPanel } from '../../components/LogsPanel';
import { FederationPanel } from '../../components/FederationPanel';
import { PluginsPanel } from '../../components/PluginsPanel';
import styles from './AdminPage.module.css';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const validTabs = ['dashboard', 'library', 'metadata', 'maintenance', 'users', 'federation', 'plugins', 'logs'];

/**
 * AdminPage Component
 * Panel de administración para gestionar la librería musical
 * Solo accesible para usuarios con rol admin
 */
export default function AdminPage() {
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const tabFromUrl = urlParams.get('tab');

  const [activeTab, setActiveTab] = useState(() => {
    // Initialize from URL if valid
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      return tabFromUrl;
    }
    return 'dashboard';
  });
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle URL tab parameter changes
  useEffect(() => {
    if (tabFromUrl && validTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Reset scroll position when tab changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  // Tab labels map
  const tabLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    library: 'Librería',
    metadata: 'Metadata',
    maintenance: 'Mantenimiento',
    users: 'Usuarios',
    federation: 'Federación',
    plugins: 'Plugins',
    logs: 'Logs',
  };

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    return [
      { label: 'Admin', onClick: () => setActiveTab('dashboard') },
      { label: tabLabels[activeTab] || 'Dashboard' },
    ];
  }, [activeTab]);

  const tabs: Tab[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'library', label: 'Librería', icon: <Library size={20} /> },
    { id: 'metadata', label: 'Metadata', icon: <Music2 size={20} /> },
    { id: 'maintenance', label: 'Mantenimiento', icon: <Wrench size={20} /> },
    { id: 'users', label: 'Usuarios', icon: <Users size={20} /> },
    { id: 'federation', label: 'Federación', icon: <Server size={20} /> },
    { id: 'plugins', label: 'Plugins', icon: <Puzzle size={20} /> },
    { id: 'logs', label: 'Logs', icon: <FileText size={20} /> },
  ];

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPanel onNavigateToTab={setActiveTab} />;
      case 'library':
        return (
          <>
            <LibraryPanel />
            <ScannerPanel />
          </>
        );
      case 'metadata':
        return (
          <>
            <MetadataConflictsPanel />
            <MetadataSettingsPanel />
          </>
        );
      case 'maintenance':
        return <MaintenanceTab />;
      case 'users':
        return <UsersPanel />;
      case 'federation':
        return <FederationPanel />;
      case 'plugins':
        return <PluginsPanel />;
      case 'logs':
        return <LogsPanel />;
      default:
        return <DashboardPanel onNavigateToTab={setActiveTab} />;
    }
  };

  return (
    <div className={styles.adminPage}>
      {/* Admin Sidebar (hidden on mobile, bottom nav on mobile) */}
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

      <main className={styles.adminPage__main}>
        <Header adminMode showBackButton />

        <div className={styles.adminPage__content} ref={contentRef}>
          {/* Breadcrumbs (hidden on mobile) */}
          <div className={styles.breadcrumbsWrapper}>
            <Breadcrumbs items={breadcrumbs} />
          </div>

          {/* Content */}
          <div className={styles.content}>
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
