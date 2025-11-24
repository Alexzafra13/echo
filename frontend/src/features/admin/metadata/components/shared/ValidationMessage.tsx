/**
 * Validation Message Component
 *
 * Displays validation feedback (success or error) with icon
 */

import { Check, X } from 'lucide-react';
import styles from './ValidationMessage.module.css';

export interface ValidationMessageProps {
  valid: boolean;
  message: string;
}

export function ValidationMessage({ valid, message }: ValidationMessageProps) {
  return (
    <div className={`${styles.validationMessage} ${valid ? styles.valid : styles.invalid}`}>
      {valid ? <Check size={16} /> : <X size={16} />}
      <span>{message}</span>
    </div>
  );
}
