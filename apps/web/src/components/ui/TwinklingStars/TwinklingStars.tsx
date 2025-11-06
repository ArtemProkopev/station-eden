'use client';

import React, { useEffect, useState, useMemo } from 'react';
import styles from './TwinklingStars.module.css';

interface StarPosition {
  left: string;
  top: string;
  animationDelay: string;
  animationDuration: string;
  filter?: string;
}

export const TwinklingStars: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Генерируем позиции звезд один раз при монтировании
  const starPositions = useMemo(() => {
    const generateStars = (count: number, durationRange: [number, number], delayRange: number) => {
      return Array.from({ length: count }).map((_, i) => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * delayRange}s`,
        animationDuration: `${durationRange[0] + Math.random() * durationRange[1]}s`
      }));
    };

    return {
      small: generateStars(80, [3, 4], 8),
      medium: generateStars(40, [4, 5], 6),
      large: generateStars(20, [5, 6], 4),
      special: Array.from({ length: 15 }).map((_, i) => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 10}s`,
        animationDuration: `${6 + Math.random() * 8}s`,
        filter: `hue-rotate(${Math.random() * 360}deg)`
      })),
      shooting: Array.from({ length: 8 }).map((_, i) => ({
        left: `${10 + Math.random() * 80}%`,
        top: `${Math.random() * 30}%`,
        animationDelay: `${Math.random() * 25 + 5}s`,
        animationDuration: '0s' // не используется для падающих звезд
      }))
    };
  }, []); // Пустой массив зависимостей - генерируется только один раз

  // Не рендерим звезды на сервере
  if (!isClient) {
    return null;
  }

  return (
    <div className={styles.starsContainer} aria-hidden="true">
      {/* Мелкие звезды */}
      <div className={styles.smallStars}>
        {starPositions.small.map((star, i) => (
          <div 
            key={`small-${i}`} 
            className={`${styles.star} ${styles.smallStar}`}
            style={{
              left: star.left,
              top: star.top,
              animationDelay: star.animationDelay,
              animationDuration: star.animationDuration
            }}
          />
        ))}
      </div>

      {/* Средние звезды */}
      <div className={styles.mediumStars}>
        {starPositions.medium.map((star, i) => (
          <div 
            key={`medium-${i}`} 
            className={`${styles.star} ${styles.mediumStar}`}
            style={{
              left: star.left,
              top: star.top,
              animationDelay: star.animationDelay,
              animationDuration: star.animationDuration
            }}
          />
        ))}
      </div>

      {/* Крупные звезды */}
      <div className={styles.largeStars}>
        {starPositions.large.map((star, i) => (
          <div 
            key={`large-${i}`} 
            className={`${styles.star} ${styles.largeStar}`}
            style={{
              left: star.left,
              top: star.top,
              animationDelay: star.animationDelay,
              animationDuration: star.animationDuration
            }}
          />
        ))}
      </div>

      {/* Особые цветные звезды */}
      <div className={styles.specialStars}>
        {starPositions.special.map((star, i) => (
          <div 
            key={`special-${i}`} 
            className={`${styles.star} ${styles.specialStar}`}
            style={{
              left: star.left,
              top: star.top,
              animationDelay: star.animationDelay,
              animationDuration: star.animationDuration,
              filter: star.filter
            }}
          />
        ))}
      </div>

      {/* Падающие звезды */}
      <div className={styles.shootingStars}>
        {starPositions.shooting.map((star, i) => (
          <div 
            key={`shooting-${i}`} 
            className={styles.shootingStar}
            style={{
              left: star.left,
              top: star.top,
              animationDelay: star.animationDelay
            }}
          />
        ))}
      </div>
    </div>
  );
};