import { useState, useCallback } from 'react';
import { ProfileData, ProfileIconsStatus, ProfileAssets } from '../types';
import { PROFILE_CONFIG } from '../config';
import { asset } from '@/lib/asset';

const migrateToAbsoluteUrl = (url: string | null): string | undefined => {
  if (!url) return undefined;
  return url.startsWith('http') ? url : asset(url);
};

export const useProfile = () => {
  const [profile, setProfile] = useState<ProfileData>({ status: 'loading' });
  const [assets, setAssets] = useState<ProfileAssets>({
    avatar: asset(PROFILE_CONFIG.DEFAULT.AVATAR),
    frame: asset(PROFILE_CONFIG.DEFAULT.FRAME),
  });
  const [iconsStatus, setIconsStatus] = useState<ProfileIconsStatus>({
    planet: true,
    polygon: true,
    copy: true,
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Загрузка сохраненных ассетов при инициализации
  const loadSavedAssets = useCallback(() => {
    const savedAvatar = localStorage.getItem(PROFILE_CONFIG.STORAGE_KEYS.AVATAR);
    const savedFrame = localStorage.getItem(PROFILE_CONFIG.STORAGE_KEYS.FRAME);

    const migratedAvatar = migrateToAbsoluteUrl(savedAvatar);
    const migratedFrame = migrateToAbsoluteUrl(savedFrame);

    if (migratedAvatar) {
      setAssets(prev => ({ ...prev, avatar: migratedAvatar }));
      localStorage.setItem(PROFILE_CONFIG.STORAGE_KEYS.AVATAR, migratedAvatar);
    }

    if (migratedFrame) {
      setAssets(prev => ({ ...prev, frame: migratedFrame }));
      localStorage.setItem(PROFILE_CONFIG.STORAGE_KEYS.FRAME, migratedFrame);
    }
  }, []);

  const checkIconsAvailability = useCallback(async () => {
    const statusUpdates: Partial<ProfileIconsStatus> = {};
    const toCheck = PROFILE_CONFIG.ASSETS.ICONS;

    await Promise.allSettled(
      Object.entries(toCheck).map(async ([key, path]) => {
        try {
          await fetch(asset(path), {
            method: 'GET',
            cache: 'no-store',
            mode: 'no-cors',
          });
          statusUpdates[key as keyof ProfileIconsStatus] = true;
        } catch {
          statusUpdates[key as keyof ProfileIconsStatus] = false;
        }
      })
    );
    setIconsStatus((prev: ProfileIconsStatus) => ({ ...prev, ...statusUpdates }));
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/auth/me`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.status === 401) {
        setProfile({
          status: 'unauth',
          message: 'Вы не авторизованы. Войдите в аккаунт, чтобы открыть профиль.',
        });
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const payload = data?.data ?? data;
      const { userId, email, username = null } = payload;

      if (typeof userId === 'string' && typeof email === 'string') {
        setProfile({ status: 'ok', userId, email, username });
      } else {
        throw new Error('Некорректный формат ответа сервера');
      }
    } catch (error) {
      console.error('Profile data loading error:', error);
      setProfile({
        status: 'error',
        message: error instanceof Error ? error.message : 'Не удалось загрузить профиль',
      });
    }
  }, []);

  const handleSaveProfile = useCallback((newAvatar: string, newFrame: string) => {
    setAssets({ avatar: newAvatar, frame: newFrame });
    localStorage.setItem(PROFILE_CONFIG.STORAGE_KEYS.AVATAR, newAvatar);
    localStorage.setItem(PROFILE_CONFIG.STORAGE_KEYS.FRAME, newFrame);
  }, []);

  const handleIconError = useCallback((iconName: keyof ProfileIconsStatus) => {
    setIconsStatus((prev: ProfileIconsStatus) => ({ ...prev, [iconName]: false }));
  }, []);

  return {
    profile,
    assets,
    iconsStatus,
    isEditModalOpen,
    loadSavedAssets,
    checkIconsAvailability,
    loadUserData,
    handleSaveProfile,
    setIconsStatus,
    setIsEditModalOpen,
    handleIconError,
  };
};