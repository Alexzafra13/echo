/**
 * Storage Mode Selector Component
 *
 * Radio buttons for selecting centralized or portable storage mode
 */

import { HardDrive } from 'lucide-react';
import type { StorageMode } from '../../types';
import styles from './StorageTab.module.css';

export interface StorageModeSelectorProps {
  mode: StorageMode;
  onChange: (mode: StorageMode) => void;
  disabled?: boolean;
}

/**
 * Storage mode selector with descriptions
 */
export function StorageModeSelector({ mode, onChange, disabled }: StorageModeSelectorProps) {
  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>
        <HardDrive size={18} />
        Modo de almacenamiento
      </h4>

      <div className={styles.radioGroup}>
        <label className={`${styles.radioOption} ${mode === 'centralized' ? styles.selected : ''}`}>
          <input
            type="radio"
            name="storageMode"
            value="centralized"
            checked={mode === 'centralized'}
            onChange={(e) => onChange(e.target.value as StorageMode)}
            disabled={disabled}
          />
          <div className={styles.radioContent}>
            <div className={styles.radioLabel}>
              <strong>Centralizado</strong>
              <span className={styles.badge}>Recomendado</span>
            </div>
            <p className={styles.radioDescription}>
              Todas las imágenes se guardan en una carpeta de la aplicación
            </p>
          </div>
        </label>

        <label className={`${styles.radioOption} ${mode === 'portable' ? styles.selected : ''}`}>
          <input
            type="radio"
            name="storageMode"
            value="portable"
            checked={mode === 'portable'}
            onChange={(e) => onChange(e.target.value as StorageMode)}
            disabled={disabled}
          />
          <div className={styles.radioContent}>
            <div className={styles.radioLabel}>
              <strong>Portable</strong>
            </div>
            <p className={styles.radioDescription}>
              Las imágenes se guardan junto a los archivos de música
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
