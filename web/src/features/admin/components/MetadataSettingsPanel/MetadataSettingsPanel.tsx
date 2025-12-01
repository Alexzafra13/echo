import { useState } from 'react';
import { Settings, History, Search } from 'lucide-react';
import { ProvidersTab } from '../../metadata/components/ProvidersTab';
import { AutoSearchTab } from '../../metadata/components/AutoSearchTab';
import { HistoryTab } from '../../metadata/components/HistoryTab';
import styles from './MetadataSettingsPanel.module.css';

type Tab = 'providers' | 'autosearch' | 'history';

/**
 * MetadataSettingsPanel Component
 * Panel para configurar y gestionar el enriquecimiento de metadatos externos
 *
 * Features:
 * - Configuración de API keys (Last.fm, Fanart.tv)
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
      id: 'autosearch' as Tab,
      label: 'Auto-Search',
      icon: <Search size={18} />,
      description: 'Auto-búsqueda de MusicBrainz IDs',
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
        {activeTab === 'autosearch' && <AutoSearchTab />}
        {activeTab === 'history' && <HistoryTab />}
      </div>
    </div>
  );
}
