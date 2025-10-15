'use client'

import { useEffect, useState, useCallback } from 'react'
import ImgCdn from '../../components/ImgCdn'
import TopHUD from '../../components/TopHUD/TopHUD'
import { asset } from '../../lib/asset'
import CopyButton from './CopyButton'
import EditProfileModal from './EditProfileModal'
import LogoutButton from './LogoutButton'
import styles from './page.module.css'
import { FirefliesProfile } from '../../components/ui/Fireflies/FirefliesProfile'
import { TwinklingStars } from '../../components/ui/TwinklingStars/TwinklingStars'

interface ProfileData {
  status: 'loading' | 'error' | 'ok' | 'unauth'
  userId?: string
  email?: string
  username?: string | null
  message?: string
}

const PROFILE_CONFIG = {
  STORAGE_KEYS: {
    AVATAR: 'profile_avatar',
    FRAME: 'profile_frame'
  } as const,
  DEFAULT: {
    AVATAR: asset('/avatars/avatar1.png'),
    FRAME: asset('/frames/frame1.png'),
    PROFILE_DATA: { status: 'loading' } as ProfileData
  },
  ICONS: {
    planet: '/icons/planet.svg',
    polygon: '/icons/polygon.svg',
    copy: '/icons/copy.svg'
  } as const
} as const

const PlanetIcon = () => (
  <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#63EFFF" opacity="0.8"/>
    <ellipse cx="8" cy="9" rx="3" ry="2" fill="#4A90E2"/>
    <path d="M5 15c2-1 4-1 6 0 2 1 4 1 6 0" stroke="#4A90E2" strokeWidth="1.5" fill="none"/>
  </svg>
)

const PolygonIcon = () => (
  <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
    <polygon 
      points="12,2 22,8 22,16 12,22 2,16 2,8" 
      fill="#63EFFF" 
      opacity="0.8"
      stroke="#4A90E2"
      strokeWidth="1.5"
    />
  </svg>
)

const formatId = (id: string): string => 
  id.replace(/-/g, '\u2009–\u2009')

const migrateToAbsoluteUrl = (url: string | null): string | undefined => {
  if (!url) return undefined
  return url.startsWith('http') ? url : asset(url)
}

// Компонент для масштабирования контента - ОБНОВЛЕННАЯ ВЕРСИЯ
const ScaleContainer = ({ children }: { children: React.ReactNode }) => {
  const [scale, setScale] = useState(1);
  
  useEffect(() => {
    const updateScale = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Базовые размеры для десктопного вида
      const baseWidth = 1200;
      const baseHeight = 800;
      
      const widthScale = (width - 40) / baseWidth; // Учитываем padding
      const heightScale = (height - 40) / baseHeight;
      
      // Используем минимальный масштаб, чтобы вместить по обеим осям
      const newScale = Math.min(widthScale, heightScale);
      
      // Ограничиваем масштаб разумными пределами
      const minScale = 0.5;
      const maxScale = 1;
      setScale(Math.max(minScale, Math.min(newScale, maxScale)));
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    
    return () => window.removeEventListener('resize', updateScale);
  }, []);
  
  return (
    <div 
      className={styles.contentWrapper}
      style={{ 
        transform: `scale(${scale})`,
        transformOrigin: 'center top'
      }}
    >
      {children}
    </div>
  );
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(PROFILE_CONFIG.DEFAULT.PROFILE_DATA)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [avatar, setAvatar] = useState(PROFILE_CONFIG.DEFAULT.AVATAR)
  const [frame, setFrame] = useState(PROFILE_CONFIG.DEFAULT.FRAME)
  const [iconsStatus, setIconsStatus] = useState<Record<string, boolean>>({})

  // Предотвращение прокрутки
  useEffect(() => {
    const preventDefault = (e: Event) => {
      e.preventDefault();
    };

    // Блокируем различные типы прокрутки
    const options = { passive: false };
    
    document.addEventListener('wheel', preventDefault, options);
    document.addEventListener('touchmove', preventDefault, options);
    
    // Также блокируем скролл на body
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('wheel', preventDefault);
      document.removeEventListener('touchmove', preventDefault);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  const checkIconsAvailability = useCallback(async () => {
    const statusUpdates: Record<string, boolean> = {}
    
    await Promise.allSettled(
      Object.entries(PROFILE_CONFIG.ICONS).map(async ([key, url]) => {
        try {
          const response = await fetch(url, { method: 'HEAD' })
          statusUpdates[key] = response.ok
        } catch {
          statusUpdates[key] = false
        }
      })
    )
    
    setIconsStatus(prev => ({ ...prev, ...statusUpdates }))
  }, [])

  const loadUserData = useCallback(async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
      const response = await fetch(`${API_BASE}/auth/me`, {
        credentials: 'include',
        cache: 'no-store',
      })

      if (response.status === 401) {
        setProfile({
          status: 'unauth',
          message: 'Вы не авторизованы. Войдите в аккаунт, чтобы открыть профиль.',
        })
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const payload = data?.data ?? data
      const { userId, email, username = null } = payload

      if (typeof userId === 'string' && typeof email === 'string') {
        setProfile({ status: 'ok', userId, email, username })
      } else {
        throw new Error('Некорректный формат ответа сервера')
      }
    } catch (error) {
      console.error('Profile data loading error:', error)
      setProfile({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Не удалось загрузить профиль' 
      })
    }
  }, [])

  useEffect(() => {
    const initializeProfile = async () => {
      const savedAvatar = localStorage.getItem(PROFILE_CONFIG.STORAGE_KEYS.AVATAR)
      const savedFrame = localStorage.getItem(PROFILE_CONFIG.STORAGE_KEYS.FRAME)
      
      const migratedAvatar = migrateToAbsoluteUrl(savedAvatar)
      const migratedFrame = migrateToAbsoluteUrl(savedFrame)

      if (migratedAvatar) {
        setAvatar(migratedAvatar)
        localStorage.setItem(PROFILE_CONFIG.STORAGE_KEYS.AVATAR, migratedAvatar)
      }

      if (migratedFrame) {
        setFrame(migratedFrame)
        localStorage.setItem(PROFILE_CONFIG.STORAGE_KEYS.FRAME, migratedFrame)
      }

      await Promise.all([
        checkIconsAvailability(),
        loadUserData()
      ])
    }

    initializeProfile()
  }, [checkIconsAvailability, loadUserData])

  const handleSaveProfile = useCallback((newAvatar: string, newFrame: string) => {
    setAvatar(newAvatar)
    setFrame(newFrame)
    localStorage.setItem(PROFILE_CONFIG.STORAGE_KEYS.AVATAR, newAvatar)
    localStorage.setItem(PROFILE_CONFIG.STORAGE_KEYS.FRAME, newFrame)
  }, [])

  const handleEditModalOpen = useCallback(() => setIsEditModalOpen(true), [])
  const handleEditModalClose = useCallback(() => setIsEditModalOpen(false), [])

  return (
    <main className={styles.root}>
      <FirefliesProfile />
      <TwinklingStars />
      
      <TopHUD />

      <ScaleContainer>
        <header className={styles.headerSection}>
          <div className={styles.headerContent}>
            <h1 className={styles.header}>ПРОФИЛЬ</h1>
            <figure className={styles.hexagonPlanet} aria-label="Декоративный элемент профиля">
              {iconsStatus.polygon ? (
                <img
                  className={styles.polygonIcon}
                  src={PROFILE_CONFIG.ICONS.polygon}
                  alt=""
                  role="presentation"
                  onError={() => setIconsStatus(prev => ({ ...prev, polygon: false }))}
                />
              ) : (
                <PolygonIcon />
              )}
              <div className={styles.planetCenter}>
                {iconsStatus.planet ? (
                  <img
                    className={styles.planetIcon}
                    src={PROFILE_CONFIG.ICONS.planet}
                    alt=""
                    role="presentation"
                    onError={() => setIconsStatus(prev => ({ ...prev, planet: false }))}
                  />
                ) : (
                  <PlanetIcon />
                )}
              </div>
            </figure>
          </div>
          <button className={styles.editBtn} onClick={handleEditModalOpen} aria-label="Редактировать профиль">
            редактировать
          </button>
        </header>

        <article className={styles.panel}>
          <div className={styles.contentGrid}>
            <section className={styles.avatarSection} aria-labelledby="user-handle">
              <div className={styles.avatarWrapper}>
                <div className={styles.leavesWrapper}>
                  <img 
                    src="/decor/leaves.png" 
                    alt="" 
                    role="presentation"
                    className={styles.leavesImage}
                  />
                </div>
                <div className={styles.avatarContainer}>
                  <ImgCdn 
                    src={avatar} 
                    alt={`Аватар пользователя ${profile.username || ''}`} 
                    className={styles.avatar} 
                  />
                  <ImgCdn 
                    src={frame} 
                    alt="Рамка профиля" 
                    className={styles.frame} 
                  />
                </div>
              </div>
              
              <h2 id="user-handle" className={styles.handle}>
                @{profile.username ?? 'Никнейм'}
              </h2>
              {profile.status === 'ok' && <LogoutButton />}
            </section>

            <section className={styles.infoSection} aria-labelledby="profile-info">
              <h3 id="profile-info" className={styles.visuallyHidden}>Информация профиля</h3>
              
              <div className={styles.loginCard}>
                <p className={styles.loginCaption}>Входит как</p>
                <p className={styles.loginEmail}>{profile.email ?? 'example@mail.ru'}</p>
                
                <div className={styles.idSection}>
                  <div className={styles.idHeader}>
                    <span className={styles.idLabel}>Игровой ID:</span>
                    {profile.status === 'ok' && profile.userId && (
                      <CopyButton value={profile.userId} />
                    )}
                  </div>
                  {profile.status === 'ok' && profile.userId && (
                    <output className={styles.idBadge} htmlFor="user-id">
                      {formatId(profile.userId)}
                    </output>
                  )}
                </div>
                
                <p className={styles.hint}>
                  Используйте ID для поддержки и входа в игровые лобби.
                </p>
              </div>
            </section>
          </div>
        </article>

        <section className={styles.statsSection} aria-labelledby="user-stats">
          <h3 id="user-stats" className={styles.visuallyHidden}>Статистика пользователя</h3>
          <div className={styles.statsGrid}>
            <article className={styles.statCard}>
              <h4 className={styles.statLabel}>завершено миссий</h4>
              <p className={styles.statValue}>47</p>
            </article>
            <article className={styles.statCard}>
              <h4 className={styles.statLabel}>время на станции</h4>
              <p className={styles.statValue}>134 ч</p>
            </article>
          </div>
        </section>

        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          onSave={handleSaveProfile}
          currentAvatar={avatar}
          currentFrame={frame}
        />
      </ScaleContainer>
    </main>
  )
}