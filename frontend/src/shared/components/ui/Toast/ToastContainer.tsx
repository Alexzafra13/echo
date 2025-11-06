import { useToast } from '@shared/context/ToastContext';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import styles from './ToastContainer.module.css';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <XCircle size={20} />;
      case 'warning':
        return <AlertCircle size={20} />;
      case 'info':
      default:
        return <Info size={20} />;
    }
  };

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}
        >
          <div className={styles.toastIcon}>{getIcon(toast.type)}</div>
          <div className={styles.toastMessage}>{toast.message}</div>
          <button
            className={styles.toastClose}
            onClick={() => removeToast(toast.id)}
            aria-label="Cerrar notificación"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
