import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useSearch } from 'wouter';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Library,
  Music2,
  Wrench,
  Users,
  FileText,
  Server,
  Monitor,
} from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useDocumentTitle } from '@shared/hooks';
import styles from './AdminPage.module.css';

// Lazy load de cada panel para reducir bundle inicial
const DashboardPanel = lazy(() =>
  import('../../components/DashboardPanel').then((m) => ({ default: m.DashboardPanel }))
);
const ScannerPanel = lazy(() =>
  import('../../components/ScannerPanel/ScannerPanel').then((m) => ({ default: m.ScannerPanel }))
);
const LibraryPanel = lazy(() =>
  import('../../components/LibraryPanel').then((m) => ({ default: m.LibraryPanel }))
);
const MetadataSettingsPanel = lazy(() =>
  import('../../components/MetadataSettingsPanel').then((m) => ({
    default: m.MetadataSettingsPanel,
  }))
);
const MetadataConflictsPanel = lazy(() =>
  import('../../components/MetadataConflictsPanel').then((m) => ({
    default: m.MetadataConflictsPanel,
  }))
);
const MaintenanceTab = lazy(() =>
  import('../../components/MetadataSettingsPanel/MaintenanceTab').then((m) => ({
    default: m.MaintenanceTab,
  }))
);
const UsersPanel = lazy(() =>
  import('../../components/UsersPanel').then((m) => ({ default: m.UsersPanel }))
);
const LogsPanel = lazy(() =>
  import('../../components/LogsPanel').then((m) => ({ default: m.LogsPanel }))
);
const FederationPanel = lazy(() =>
  import('../../components/FederationPanel').then((m) => ({ default: m.FederationPanel }))
);
const ServerMetricsPanel = lazy(() =>
  import('../../components/ServerMetricsPanel/ServerMetricsPanel').then((m) => ({
    default: m.ServerMetricsPanel,
  }))
);

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const validTabs = [
  'dashboard',
  'server',
  'library',
  'metadata',
  'maintenance',
  'users',
  'federation',
  'logs',
];

function TabFallback() {
  return <div className={styles.tabLoading} />;
}

/**
 * AdminPage Component
 * Panel de administración para gestionar la librería musical
 * Solo accesible para usuarios con rol admin
 */
export default function AdminPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('admin.pageTitle'));
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const tabFromUrl = urlParams.get('tab');

  const [activeTab, setActiveTab] = useState(() => {
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      return tabFromUrl;
    }
    return 'dashboard';
  });
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabFromUrl && validTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  const tabs: Tab[] = [
    { id: 'dashboard', label: t('admin.tabs.dashboard'), icon: <LayoutDashboard size={20} /> },
    { id: 'server', label: 'Server', icon: <Monitor size={20} /> },
    { id: 'library', label: t('admin.tabs.library'), icon: <Library size={20} /> },
    { id: 'metadata', label: t('admin.tabs.metadata'), icon: <Music2 size={20} /> },
    { id: 'maintenance', label: t('admin.tabs.maintenance'), icon: <Wrench size={20} /> },
    { id: 'users', label: t('admin.tabs.users'), icon: <Users size={20} /> },
    { id: 'federation', label: t('admin.tabs.federation'), icon: <Server size={20} /> },
    { id: 'logs', label: t('admin.tabs.logs'), icon: <FileText size={20} /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPanel onNavigateToTab={setActiveTab} />;
      case 'server':
        return <ServerMetricsPanel />;
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
      case 'logs':
        return <LogsPanel />;
      default:
        return <DashboardPanel onNavigateToTab={setActiveTab} />;
    }
  };

  return (
    <div className={styles.adminPage}>
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

      <main className={styles.adminPage__main}>
        <Header adminMode showBackButton />

        <div className={styles.adminPage__content} ref={contentRef}>
          <div className={styles.content}>
            <Suspense fallback={<TabFallback />}>{renderContent()}</Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
