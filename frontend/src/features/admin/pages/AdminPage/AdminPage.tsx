import { useState } from 'react';
import { LayoutDashboard, Library, Music2, Wrench, Users, FileText } from 'lucide-react';
import { Tabs, Tab } from '../../components/Tabs';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
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

  return (
    <div className={styles.adminPage}>
      <Sidebar />

      <main className={styles.adminPage__main}>
        <Header showBackButton />

        <div className={styles.adminPage__content}>
          <div className={styles.header}>
            <h1 className={styles.title}>Panel de Administración</h1>
            <p className={styles.subtitle}>
              Gestiona tu librería musical y configuración del servidor
            </p>
          </div>

          <div className={styles.content}>
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </div>
      </main>
    </div>
  );
}
