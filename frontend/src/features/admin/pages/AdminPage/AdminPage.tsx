import { useState } from 'react';
import { Library, Music2, Wrench, Users } from 'lucide-react';
import { Tabs, Tab } from '../../components/Tabs';
import { Header } from '@shared/components/layout/Header';
import { ScannerPanel } from '../../components/ScannerPanel/ScannerPanel';
import { MetadataSettingsPanel } from '../../components/MetadataSettingsPanel';
import { MetadataConflictsPanel } from '../../components/MetadataConflictsPanel';
import { MaintenanceTab } from '../../components/MetadataSettingsPanel/MaintenanceTab';
import { UsersPanel } from '../../components/UsersPanel';
import styles from './AdminPage.module.css';

/**
 * AdminPage Component
 * Panel de administración para gestionar la librería musical
 * Solo accesible para usuarios con rol admin
 */
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('library');

  const tabs: Tab[] = [
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
  ];

  return (
    <>
      <Header adminMode showBackButton />
      <div className={styles.container}>
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
    </>
  );
}
