'use client';

import { PROFILE_CONFIG } from '../config';
import { FallbackIcon, PolygonIcon, PlanetIcon } from './ProfileIcons';
import { asset } from '@/lib/asset';
import styles from '../page.module.css';

interface ProfileHeaderProps {
  onEditClick: () => void;
  iconsStatus: {
    planet: boolean;
    polygon: boolean;
  };
  onIconError: (iconName: string) => void;
}

export const ProfileHeader = ({ 
  onEditClick, 
  iconsStatus, 
  onIconError 
}: ProfileHeaderProps) => {
  return (
    <header className={styles.headerSection}>
      <div className={styles.headerContent}>
        <h1 className={styles.header}>ПРОФИЛЬ</h1>
        <figure
          className={styles.hexagonPlanet}
          aria-label='Декоративный элемент профиля'
        >
          {iconsStatus.polygon ? (
            <FallbackIcon
              type="polygon"
              fallbackUrl={asset(PROFILE_CONFIG.ASSETS.ICONS.polygon)}
              className={styles.polygonIcon}
              onError={() => onIconError('polygon')}
            />
          ) : (
            <PolygonIcon className={styles.polygonIcon} />
          )}
          <div className={styles.planetCenter}>
            {iconsStatus.planet ? (
              <FallbackIcon
                type="planet"
                fallbackUrl={asset(PROFILE_CONFIG.ASSETS.ICONS.planet)}
                className={styles.planetIcon}
                onError={() => onIconError('planet')}
              />
            ) : (
              <PlanetIcon className={styles.planetIcon} />
            )}
          </div>
        </figure>
      </div>
      <button
        className={styles.editBtn}
        onClick={onEditClick}
        aria-label='Редактировать профиль'
      >
        редактировать
      </button>
    </header>
  );
};