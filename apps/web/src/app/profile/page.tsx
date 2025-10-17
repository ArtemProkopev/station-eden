// apps/web/src/app/profile/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useProfile } from './hooks/useProfile';
import { useScrollPrevention } from './hooks/useScrollPrevention';
import { ProfileHeader } from './components/ProfileHeader';
import { ProfileAvatar } from './components/ProfileAvatar';
import { ProfileInfo } from './components/ProfileInfo';
import { ProfileStats } from './components/ProfileStats';
import EditProfileModal from './components/EditProfileModal';
import TopHUD from '@/components/TopHUD/TopHUD';
import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile';
import { ScaleContainer } from '@/components/ui/ScaleContainer/ScaleContainer';
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars';
import styles from './page.module.css';

export default function ProfilePage() {
  const {
    profile,
    assets,
    iconsStatus,
    isEditModalOpen,
    loadSavedAssets,
    loadUserData,
    checkIconsAvailability,
    handleSaveProfile,
    setIconsStatus,
    setIsEditModalOpen
  } = useProfile();

  const [isLoading, setIsLoading] = useState(true);

  useScrollPrevention();

  useEffect(() => {
    const initializeProfile = async () => {
      console.log('🔄 Starting profile initialization...');
      setIsLoading(true);
      
      try {
        loadSavedAssets();
        
        await Promise.all([
          checkIconsAvailability(), 
          loadUserData()
        ]);
        
        console.log('Profile initialization complete');
      } catch (error) {
        console.error('Profile initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeProfile();
  }, [loadSavedAssets, checkIconsAvailability, loadUserData]);

  const handleEditModalOpen = useCallback(() => setIsEditModalOpen(true), []);
  const handleEditModalClose = useCallback(() => setIsEditModalOpen(false), []);
  const handleIconError = useCallback((iconName: string) => {
    setIconsStatus(prev => ({ ...prev, [iconName]: false }));
  }, []);

  // Показываем лоадер пока данные не загружены
  if (isLoading) {
    return (
      <main className={styles.root}>
        <FirefliesProfile />
        <TwinklingStars />
        <TopHUD />
        <ScaleContainer baseWidth={1200} baseHeight={800} minScale={0.5} maxScale={1}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Загрузка профиля...</p>
          </div>
        </ScaleContainer>
      </main>
    );
  }

  return (
    <main className={styles.root}>
      <FirefliesProfile />
      <TwinklingStars />

      <TopHUD profile={profile} avatar={assets.avatar} />

      <ScaleContainer
        baseWidth={1200}
        baseHeight={800}
        minScale={0.5}
        maxScale={1}
      >
        <ProfileHeader
          onEditClick={handleEditModalOpen}
          iconsStatus={iconsStatus}
          onIconError={handleIconError}
        />

        <article className={styles.panel}>
          <div className={styles.contentGrid}>
            <ProfileAvatar
              avatar={assets.avatar}
              frame={assets.frame}
              username={profile.username}
            />
            <ProfileInfo profile={profile} />
          </div>
        </article>

        <ProfileStats />

        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          onSave={handleSaveProfile}
          currentAvatar={assets.avatar}
          currentFrame={assets.frame}
        />
      </ScaleContainer>
    </main>
  );
}