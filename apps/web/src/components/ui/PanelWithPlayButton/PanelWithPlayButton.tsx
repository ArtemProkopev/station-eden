// components/PanelWithPlayButton/PanelWithPlayButton.tsx
'use client';

import { useState } from 'react';
import styles from './PanelWithPlayButton.module.css';

interface PanelWithPlayButtonProps {
  onPlayClick?: () => void;
  className?: string;
}

export default function PanelWithPlayButton({ 
  onPlayClick, 
  className = '' 
}: PanelWithPlayButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handlePlayClick = () => {
    onPlayClick?.();
    // Здесь можно добавить логику воспроизведения звука или другие эффекты
  };

  return (
    <div className={`${styles.mainButtonContainer} ${className}`}>
      {/* Панель как фон для кнопки */}
      <img 
        src="/panel.png" 
        alt="Panel" 
        className={styles.panelBackground} 
      />
      
      {/* Кнопка Play поверх панели */}
      <button 
        className={styles.mainPlayButton}
        onClick={handlePlayClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Play Station Eden"
      >
        <span className={styles.playText}>Играть</span>
        <div className={styles.topEdge}></div>
      </button>
    </div>
  );
}