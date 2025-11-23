import { useState, useMemo } from 'react';
import { LayoutDashboard, Library, Music2, Wrench, Users, FileText } from 'lucide-react';
import { Tabs, Tab } from '../../components/Tabs';
import { Header } from '@shared/components/layout/Header';
import { AdminSidebar } from '../../components/AdminSidebar';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { DashboardPanel } from '../../components/DashboardPanel';
import { ScannerPanel } from '../../components/ScannerPanel/ScannerPanel';
import { MetadataSettingsPanel } from '../../components/MetadataSettingsPanel';
import { MetadataConflictsPanel } from '../../components/MetadataConflictsPanel';
import { MaintenanceTab } from '../../components/MetadataSettingsPanel/MaintenanceTab';
import { UsersPanel } from '../../components/UsersPanel';
import { LogsPanel } from '../../components/LogsPanel';
import styles from './AdminPage.module.css';

/**
 * AdminPage Component
 * Panel de administración para gestionar la librería musical
 * Solo accesible para usuarios con rol admin
 */
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Tab labels map
  const tabLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    library: 'Librería',
    metadata: 'Metadata',
    maintenance: 'Mantenimiento',
    users: 'Usuarios',
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
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      content: (
        <div className={styles.tabContent}>
          <DashboardPanel />
        </div>
      ),
    },
    {
      id: 'library',
      label: 'Librería',
      icon: <Library size={20} />,
      content: (
        <div className={styles.tabContent}>
          <ScannerPanel />
        </div>
      ),
    },
    {
      id: 'metadata',
      label: 'Metadata',
      icon: <Music2 size={20} />,
      content: (
        <div className={styles.tabContent}>
          <MetadataConflictsPanel />
          <MetadataSettingsPanel />
        </div>
      ),
    },
    {
      id: 'maintenance',
      label: 'Mantenimiento',
      icon: <Wrench size={20} />,
      content: (
        <div className={styles.tabContent}>
          <MaintenanceTab />
        </div>
      ),
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: <Users size={20} />,
      content: (
        <div className={styles.tabContent}>
          <UsersPanel />
        </div>
      ),
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: <FileText size={20} />,
      content: (
        <div className={styles.tabContent}>
          <LogsPanel />
        </div>
      ),
    },
  ];

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPanel />;
      case 'library':
        return <ScannerPanel />;
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
      case 'logs':
        return <LogsPanel />;
      default:
        return <DashboardPanel />;
    }
  };

  return (
    <div className={styles.adminPage}>
      {/* Admin Sidebar (hidden on mobile) */}
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className={styles.adminPage__main}>
        <Header adminMode showBackButton />

        {/* Mobile tabs (shown only on mobile when sidebar is hidden) */}
        <div className={styles.mobileTabs}>
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <div className={styles.adminPage__content}>
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
