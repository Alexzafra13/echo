import { ReactNode } from 'react';
import styles from './Tabs.module.css';

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

/**
 * Tabs Component
 * Reusable tab navigation system
 */
export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className={styles.tabs}>
      {/* Tab Navigation */}
      <div className={styles.tabs__nav}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabs__button} ${
              activeTab === tab.id ? styles.tabs__button__active : ''
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.icon && <span className={styles.tabs__icon}>{tab.icon}</span>}
            <span className={styles.tabs__label}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.tabs__content}>
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}
