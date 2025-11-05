import { useState } from 'react';
import { Settings, Database, History } from 'lucide-react';
import { ProvidersTab } from './ProvidersTab';
import { MaintenanceTab } from './MaintenanceTab';
import { HistoryTab } from './HistoryTab';
import styles from './MetadataSettingsPanel.module.css';

type Tab = 'providers' | 'maintenance' | 'history';

/**
 * MetadataSettingsPanel Component
 * Panel para configurar y gestionar el enriquecimiento de metadatos externos
 *
 * Features:
 * - Configuración de API keys (Last.fm, Fanart.tv)
 * - Mantenimiento (cleanup, storage stats)
 * - Historial de enriquecimientos
 */
export function MetadataSettingsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('providers');

  const tabs = [
    {
      id: 'providers' as Tab,
      label: 'Providers',
      icon: <Settings size={18} />,
      description: 'Configurar API keys y proveedores',
    },
    {
      id: 'maintenance' as Tab,
      label: 'Mantenimiento',
      icon: <Database size={18} />,
      description: 'Limpieza y estadísticas de almacenamiento',
    },
    {
      id: 'history' as Tab,
      label: 'Historial',
      icon: <History size={18} />,
      description: 'Historial de enriquecimientos',
    },
  ];

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>External Metadata</h2>
          <p className={styles.description}>
            Configura proveedores externos para enriquecer artistas y álbumes con biografías, imágenes y portadas
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.description}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'providers' && <ProvidersTab />}
        {activeTab === 'maintenance' && <MaintenanceTab />}
        {activeTab === 'history' && <HistoryTab />}
      </div>
    </div>
  );
}
