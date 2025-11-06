'use client';

import React from 'react';
import styles from './FirefliesMain.module.css';

export const Fireflies: React.FC = () => {
  return (
    <div className={styles.fireflies} aria-hidden="true">
      <div className={styles.firefly}></div>
      <div className={styles.firefly}></div>
      <div className={styles.firefly}></div>
      <div className={styles.firefly}></div>
      <div className={styles.firefly}></div>
      <div className={styles.firefly}></div>
      <div className={styles.firefly}></div>
      <div className={styles.firefly}></div>
    </div>
  );
};