// apps/web/src/app/profile/components/loading.tsx

import styles from './page.module.css';

export default function Loading() {
  return (
    <main className={styles.root}>
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Загрузка профиля...</p>
      </div>
    </main>
  );
}
