/**
 * Path Input Component
 *
 * Input field with validation display for storage path configuration
 */

import { Folder, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { Input, Button } from '@shared/components/ui';
import type { StorageValidationResult } from '../../types';
import styles from './StorageTab.module.css';

export interface PathInputProps {
  path: string;
  onChange: (path: string) => void;
  onBlur: () => void;
  onBrowse: () => void;
  validationResult: StorageValidationResult | null;
  isValidating: boolean;
  disabled?: boolean;
}

/**
 * Path input with validation feedback
 */
export function PathInput({
  path,
  onChange,
  onBlur,
  onBrowse,
  validationResult,
  isValidating,
  disabled,
}: PathInputProps) {
  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>
        <Folder size={18} />
        Ruta de almacenamiento
      </h4>

      <div className={styles.pathInput}>
        <Input
          type="text"
          value={path}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="/app/uploads/metadata"
          disabled={disabled}
        />
        <Button onClick={onBrowse} variant="outline" size="sm" disabled={disabled}>
          Explorar
        </Button>
      </div>

      {/* Validation Status */}
      {isValidating && <div className={styles.validating}>Validando ruta...</div>}

      {validationResult && !isValidating && (
        <div
          className={`${styles.validation} ${
            validationResult.valid ? styles.valid : styles.invalid
          }`}
        >
          {validationResult.valid ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <div>
            <strong>{validationResult.message}</strong>
            {validationResult.readOnly && (
              <div className={styles.warning}>
                <Lock size={14} />
                Esta ruta es de solo lectura. Las imágenes no se podrán guardar aquí.
              </div>
            )}
            {!validationResult.exists && validationResult.writable && (
              <div className={styles.info}>
                La carpeta se creará automáticamente al guardar.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
