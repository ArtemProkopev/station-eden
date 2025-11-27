'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import TopHUD from '../components/TopHUD/TopHUD'
import { Fireflies } from '../components/ui/Fireflies/FirefliesMain'
import PanelWithPlayButton from '../components/ui/PanelWithPlayButton/PanelWithPlayButton'
import styles from './home.module.css'

interface UserProfile {
  id: string
  email: string
  username: string
  avatar?: string
}

const NEWS_DATA = [
  {
    id: 1,
    title: 'ОБНОВЛЕНИЕ ЭКИПАЖА',
    date: '2025-12-10',
    content: 'Уже сегодня в игре появится три новые роли!',
    highlight: 'Разнообразие — ключ к выживанию',
  },
  {
    id: 2,
    title: 'НОВЫЙ РЕЖИМ ИГРЫ',
    date: '2025-11-28',
    content: 'Добавлен кооперативный режим для 4 игроков',
    highlight: 'Выживайте вместе с друзьями',
  },
  {
    id: 3,
    title: 'ОБНОВЛЕНИЕ БАЛАНСА',
    date: '2025-11-15',
    content: 'Переработана система характеристик персонажей',
    highlight: 'Справедливость для всех ролей',
  },
] as const

const SOCIAL_ICONS = [
  { 
    href: 'https://t.me/your-channel', 
    icon: '/icons/telegram.svg', 
    alt: 'Telegram' 
  },
  { 
    href: 'https://tiktok.com/@your-account', 
    icon: '/icons/tiktok.svg', 
    alt: 'TikTok' 
  },
  { 
    href: 'https://discord.gg/your-server', 
    icon: '/icons/discord.svg', 
    alt: 'Discord' 
  }
] as const

function NewsSlider() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % NEWS_DATA.length)
    }, 7000)
    return () => clearInterval(interval)
  }, [])

  const nextNews = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % NEWS_DATA.length)
  }, [])

  const prevNews = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + NEWS_DATA.length) % NEWS_DATA.length)
  }, [])

  const currentNews = NEWS_DATA[currentIndex]

  return (
    <div className={styles.newsSliderContainer}>
      <button 
        className={styles.sliderArrowLeft} 
        onClick={prevNews}
        aria-label="Предыдущая новость"
      >
        ‹
      </button>

      <div className={styles.newsPanel}>
        <div className={styles.newsHeader}>
          <span className={styles.newsTitle}>{currentNews.title}</span>
          <span className={styles.newsDate}>
            Дата: {currentNews.date}
          </span>
        </div>
        <div className={styles.newsContent}>
          <p className={styles.newsInfo}>{currentNews.content}</p>
          <p className={styles.newsHighlight}>{currentNews.highlight}</p>
        </div>
      </div>

      <button 
        className={styles.sliderArrowRight} 
        onClick={nextNews}
        aria-label="Следующая новость"
      >
        ›
      </button>
    </div>
  )
}

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem('authToken')
      const userData = localStorage.getItem('userData')

      if (token && userData) {
        try {
          const parsedUserData: UserProfile = JSON.parse(userData)
          setIsAuthenticated(true)
          setUserProfile(parsedUserData)
        } catch (error) {
          console.error('Error parsing user data:', error)
          setIsAuthenticated(false)
          setUserProfile(null)
        }
      } else {
        setIsAuthenticated(false)
        setUserProfile(null)
      }
      setIsLoading(false)
    }

    checkAuthStatus()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken' || e.key === 'userData') {
        checkAuthStatus()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    const interval = setInterval(checkAuthStatus, 5000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const handlePlayClick = useCallback(() => {
    if (isAuthenticated) {
      router.push('/lobby')
    } else {
      router.push('/login')
    }
  }, [router, isAuthenticated])

  const handleRegister = () => router.push('/register')
  const handleLogin = () => router.push('/login')

  return (
    <>
      <div className={styles.bg} aria-hidden />
      <div className={styles.bgFx} aria-hidden />

      <Fireflies />

      {/* TopHUD показываем ТОЛЬКО для авторизованных пользователей */}
      {isAuthenticated && userProfile && (
        <TopHUD
          variant='main'
          profile={{
            status: 'ok' as const,
            userId: userProfile.id,
            email: userProfile.email,
            username: userProfile.username,
          }}
          avatar={userProfile.avatar}
        />
      )}

      <div className={styles.container}>
        <section className={styles.leftSection}>
          <div className={styles.stationTitle}>
            <div className={styles.titleLine}>Станция Эдем</div>
          </div>

          <NewsSlider />
        </section>

        <section className={styles.menuSection}>
          {/* Кнопки регистрации/входа показываем ТОЛЬКО для неавторизованных */}
          {!isAuthenticated && (
            <nav className={styles.sideMenu}>
              <button className={styles.menuItem} onClick={handleRegister}>
                ЗАРЕГИСТРИРОВАТЬСЯ
              </button>
              <button className={styles.menuItem} onClick={handleLogin}>
                ВОЙТИ
              </button>
            </nav>
          )}

          <PanelWithPlayButton onPlayClick={handlePlayClick} />
        </section>

        <div className={styles.socialSection}>
          <p className={styles.socialText}>Мы в социальных сетях:</p>
          <div className={styles.socialIcons}>
            {SOCIAL_ICONS.map((item) => (
              <a
                key={item.alt}
                href={item.href}
                className={styles.socialIcon}
                target='_blank'
                rel='noopener noreferrer'
                aria-label={item.alt}
              >
                <Image 
                  src={item.icon} 
                  alt={item.alt}
                  width={50}
                  height={50}
                  quality={75}
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}