// apps/web/src/components/ui/FirefliesProfile/FirefliesProfle.tsx
'use client';

import React from 'react';
import styles from './FirefliesProfile.module.css';

export const FirefliesProfile: React.FC = () => {
  return (
    <div className={styles.background} aria-hidden="true">
      {/* Левая группа светлячков */}
      <div className={styles.leftGroup}>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
      </div>
      
      {/* Правая группа светлячков */}
      <div className={styles.rightGroup}>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
        <div className={styles.firefly}></div>
      </div>
    </div>
  );
};