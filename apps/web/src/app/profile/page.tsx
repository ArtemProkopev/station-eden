// =====================
// apps/web/src/app/profile/page.tsx
// =====================
'use client'

import { useEffect, useState } from 'react'
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

const STORAGE_KEYS = { AVATAR: 'profile_avatar', FRAME: 'profile_frame' }
const DEFAULT_AVATAR = asset('/avatars/avatar1.png')
const DEFAULT_FRAME = asset('/frames/frame1.png')
const DEFAULT_PROFILE_DATA: ProfileData = { status: 'loading' }

const ICONS = {
  planet: '/icons/planet.svg',
  polygon: '/icons/polygon.svg',
  copy: '/icons/copy.svg'
}

const FALLBACKS = {
  planet: (
    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#63EFFF" opacity="0.8"/>
      <ellipse cx="8" cy="9" rx="3" ry="2" fill="#4A90E2"/>
      <path d="M5 15c2-1 4-1 6 0 2 1 4 1 6 0" stroke="#4A90E2" strokeWidth="1.5" fill="none"/>
    </svg>
  ),
  polygon: (
    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden>
      <polygon 
        points="12,2 22,8 22,16 12,22 2,16 2,8" 
        fill="#63EFFF" 
        opacity="0.8"
        stroke="#4A90E2"
        strokeWidth="1.5"
      />
    </svg>
  ),
}

function formatId(id: string) {
  return id.replace(/-/g, '\u2009–\u2009')
}

export default function ProfilePage() {
  const [me, setMe] = useState<ProfileData>(DEFAULT_PROFILE_DATA)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR)
  const [frame, setFrame] = useState(DEFAULT_FRAME)
  const [iconsOk, setIconsOk] = useState<{[k: string]: boolean}>({})

  useEffect(() => {
    // Проверка иконок
    Object.entries(ICONS).forEach(([key, url]) => {
      fetch(url, { method: 'HEAD' })
        .then(res => {
          setIconsOk(prev => ({ ...prev, [key]: res.ok }))
        })
        .catch(err => {
          console.error('[ProfilePage] fetch error for', url, err)
          setIconsOk(prev => ({ ...prev, [key]: false }))
        })
    })

    const loadUserData = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
        const r = await fetch(`${API_BASE}/auth/me`, {
          credentials: 'include',
          cache: 'no-store',
        })
        if (r.status === 401) {
          setMe({
            status: 'unauth',
            message: 'Вы не авторизованы. Войдите в аккаунт, чтобы открыть профиль.',
          })
          return
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const raw = await r.json()
        const payload = raw?.data ?? raw
        const userId = payload?.userId
        const email = payload?.email
        const username = payload?.username ?? null
        if (typeof userId === 'string' && typeof email === 'string') {
          setMe({ status: 'ok', userId, email, username })
        } else {
          throw new Error('Malformed response')
        }
      } catch (e: any) {
        setMe({ status: 'error', message: e?.message || 'Не удалось загрузить профиль' })
      }
    }

    // migrate LS values to absolute urls
    const savedAvatar = localStorage.getItem(STORAGE_KEYS.AVATAR)
    const savedFrame = localStorage.getItem(STORAGE_KEYS.FRAME)
    const toAbs = (val?: string | null) => (val && !/^https?:\/\//.test(val) ? asset(val) : val || undefined)
    const migAvatar = toAbs(savedAvatar)
    const migFrame = toAbs(savedFrame)
    if (migAvatar) {
      setAvatar(migAvatar)
      localStorage.setItem(STORAGE_KEYS.AVATAR, migAvatar)
    }
    if (migFrame) {
      setFrame(migFrame)
      localStorage.setItem(STORAGE_KEYS.FRAME, migFrame)
    }
    loadUserData()
  }, [])

  const handleSaveProfile = (newAvatar: string, newFrame: string) => {
    setAvatar(newAvatar)
    setFrame(newFrame)
    localStorage.setItem(STORAGE_KEYS.AVATAR, newAvatar)
    localStorage.setItem(STORAGE_KEYS.FRAME, newFrame)
  }

  return (
    <div className={styles.root}>
      {/* Фон со светлячками */}
      <FirefliesProfile />
      {/* Фон со звездами */}
      <TwinklingStars />

      {/* top HUD */}
      <TopHUD />

      {/* header section with profile title and planet */}
      <section className={styles.headerSection}>
        <header className={styles.header}>ПРОФИЛЬ</header>
        <div className={styles.hexagonPlanet}>
          {iconsOk.polygon ? (
            <img
              className={styles.polygonIcon}
              src={ICONS.polygon}
              alt="Шестиугольник"
              onError={(e) => {
                console.error('img onError', (e.target as HTMLImageElement).src)
                setIconsOk(prev => ({ ...prev, polygon: false }))
              }}
            />
          ) : (
            FALLBACKS.polygon
          )}
          <div className={styles.planetCenter}>
            {iconsOk.planet ? (
              <img
                className={styles.planetIcon}
                src={ICONS.planet}
                alt="Планета"
                onError={(e) => {
                  console.error('img onError', (e.target as HTMLImageElement).src)
                  setIconsOk(prev => ({ ...prev, planet: false }))
                }}
              />
            ) : (
              FALLBACKS.planet
            )}
          </div>
        </div>
        <button className={styles.editBtn} onClick={() => setIsEditModalOpen(true)}>редактировать</button>
      </section>

      {/* main panel */}
      <section className={styles.panel}>
        <div className={styles.contentGrid}>
          {/* avatar column */}
          <aside className={styles.side}>
            {/* Объединенный контейнер для листьев, аватара и рамки */}
            <div className={styles.avatarSection}>
              <div className={styles.leavesWrapper}>
                <img 
                  src="/decor/leaves.png" 
                  alt="Листья" 
                  className={styles.leavesImage}
                />
              </div>
              <div className={styles.avatarContainer}>
                <ImgCdn src={avatar} alt='Аватар' className={styles.avatar} />
                <ImgCdn src={frame} alt='Рамка' className={styles.frame} />
              </div>
            </div>
            
            <div className={styles.handle}>@{me.username ?? 'Никнейм'}</div>
            {me.status === 'ok' ? <LogoutButton /> : null}
          </aside>

          {/* info column */}
          <div className={styles.info}>

            <div className={styles.loginCard}>
              <div className={styles.loginCaption}>Входит как</div>
              <div className={styles.loginRow}>
                <span className={styles.loginEmail}>{me.email ?? 'example@mail.ru'}</span>
              </div>
              <div className={styles.idRow}>
                <div className={styles.idLabel}>Игровой ID:</div>
                {me.status === 'ok' && <CopyButton value={me.userId!} />}
              </div>
              {me.status === 'ok' && (
                <div className={styles.idBadge} title={me.userId} aria-describedby='id-hint'>
                  {formatId(me.userId!)}
                </div>
              )}
              <p id='id-hint' className={styles.hint}>Используйте ID для поддержки и входа в игровые лобби.</p>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <div className={styles.statLabel}>завершено миссий</div>
                <div className={styles.statValue}>47</div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statLabel}>время на станции</div>
                <div className={styles.statValue}>134 ч</div>
              </div>
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveProfile}
        currentAvatar={avatar}
        currentFrame={frame}
      />
    </div>
  )
}