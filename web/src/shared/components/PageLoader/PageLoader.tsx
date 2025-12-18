import styles from './PageLoader.module.css';

/**
 * Full-page loading spinner for lazy-loaded routes
 */
export function PageLoader() {
  return (
    <div className={styles.container}>
      <div className={styles.spinner} />
    </div>
  );
}
