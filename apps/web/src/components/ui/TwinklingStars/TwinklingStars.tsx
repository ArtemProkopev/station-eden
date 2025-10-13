// apps/web/src/components/ui/TwinklingStars/TwinklingStars.tsx
'use client';

import React from 'react';
import styles from './TwinklingStars.module.css';

export const TwinklingStars: React.FC = () => {
  return (
    <div className={styles.starsContainer} aria-hidden="true">
      {/* Мелкие звезды */}
      <div className={styles.smallStars}>
        {Array.from({ length: 80 }).map((_, i) => (
          <div 
            key={`small-${i}`} 
            className={`${styles.star} ${styles.smallStar}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      {/* Средние звезды */}
      <div className={styles.mediumStars}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div 
            key={`medium-${i}`} 
            className={`${styles.star} ${styles.mediumStar}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${4 + Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* Крупные звезды */}
      <div className={styles.largeStars}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={`large-${i}`} 
            className={`${styles.star} ${styles.largeStar}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${5 + Math.random() * 6}s`
            }}
          />
        ))}
      </div>

      {/* Особые цветные звезды */}
      <div className={styles.specialStars}>
        {Array.from({ length: 15 }).map((_, i) => (
          <div 
            key={`special-${i}`} 
            className={`${styles.star} ${styles.specialStar}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${6 + Math.random() * 8}s`,
              filter: `hue-rotate(${Math.random() * 360}deg)`
            }}
          />
        ))}
      </div>

      {/* Падающие звезды */}
      <div className={styles.shootingStars}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div 
            key={`shooting-${i}`} 
            className={styles.shootingStar}
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${Math.random() * 30}%`,
              animationDelay: `${Math.random() * 25 + 5}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};