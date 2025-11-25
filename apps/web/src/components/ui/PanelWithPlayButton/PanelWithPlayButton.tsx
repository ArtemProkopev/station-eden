'use client';

import { useState, useCallback, memo } from 'react';
import Image from 'next/image';
import styles from './PanelWithPlayButton.module.css';

interface PanelWithPlayButtonProps {
  onPlayClick?: () => void;
  className?: string;
}

// CDN путь как константа
const PANEL_IMAGE_URL = 'https://cdn.assets.stationeden.ru/web/panel-optimized.webp';

function PanelWithPlayButton({ 
  onPlayClick, 
  className = '' 
}: PanelWithPlayButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handlePlayClick = useCallback(() => {
    onPlayClick?.();
  }, [onPlayClick]);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <div className={`${styles.mainButtonContainer} ${className}`}>
      {/* Теперь Next.js Image будет работать без ошибок */}
      <Image 
        src={PANEL_IMAGE_URL}
        alt="Panel Background" 
        className={styles.panelBackground}
        width={600}
        height={400}
        quality={85}
        priority={true} // Приоритетная загрузка для выше-fold контента
        // Next.js автоматически добавит srcset для респонсивности
      />
      
      <button 
        className={styles.mainPlayButton}
        onClick={handlePlayClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="Play Station Eden"
      >
        <span className={styles.playText}>Играть</span>
        <div className={styles.topEdge} data-hovered={isHovered}></div>
      </button>
    </div>
  );
}

export default memo(PanelWithPlayButton);