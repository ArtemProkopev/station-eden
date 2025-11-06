// apps/web/src/app/page.tsx
'use client'

import styles from './home.module.css'
import { Fireflies } from '../components/ui/Fireflies/FirefliesMain'
import PanelWithPlayButton from '../components/ui/PanelWithPlayButton/PanelWithPlayButton'
import TopMainHUD from '../components/TopMainHUD/TopMainHUD'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

const newsData = [
  {
    id: 1,
    title: 'ОБНОВЛЕНИЕ ЭКИПАЖА',
    date: '2025-12-10',
    content: 'Уже сегодня в игре появится три новые роли!',
    highlight: 'Разнообразие — ключ к выживанию'
  },
  {
    id: 2,
    title: 'НОВЫЙ РЕЖИМ ИГРЫ',
    date: '2025-11-28',
    content: 'Добавлен кооперативный режим для 4 игроков',
    highlight: 'Выживайте вместе с друзьями'
  },
  {
    id: 3,
    title: 'ОБНОВЛЕНИЕ БАЛАНСА',
    date: '2025-11-15',
    content: 'Переработана система характеристик персонажей',
    highlight: 'Справедливость для всех ролей'
  }
]

export default function HomePage() {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const currentNews = newsData[currentNewsIndex]
  const router = useRouter()

  // Проверяем статус аутентификации
  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem('authToken')
      const userData = localStorage.getItem('userData')
      
      console.log('🔐 Checking auth status:')
      console.log('   Token exists:', !!token)
      console.log('   UserData exists:', !!userData)
      
      if (token && userData) {
        try {
          const parsedUserData: UserProfile = JSON.parse(userData)
          setIsAuthenticated(true)
          setUserProfile(parsedUserData)
          console.log('✅ User is authenticated:', parsedUserData)
        } catch (error) {
          console.error('❌ Error parsing user data:', error)
          setIsAuthenticated(false)
          setUserProfile(null)
        }
      } else {
        console.log('❌ No auth data found')
        setIsAuthenticated(false)
        setUserProfile(null)
      }
    }

    // Проверяем сразу при загрузке
    checkAuthStatus()

    // Слушаем события изменения аутентификации
    const handleAuthChange = () => {
      console.log('🔄 Auth change event received')
      checkAuthStatus()
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken' || e.key === 'userData') {
        console.log('💾 Storage change detected:', e.key)
        checkAuthStatus()
      }
    }

    window.addEventListener('authChange', handleAuthChange)
    window.addEventListener('storage', handleStorageChange)
    
    // Также проверяем периодически на всякий случай
    const interval = setInterval(checkAuthStatus, 2000)
    
    return () => {
      window.removeEventListener('authChange', handleAuthChange)
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  // Автопереключение новостей
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % newsData.length)
    }, 7000) 

    return () => clearInterval(interval)
  }, [])

  const nextNews = () => {
    setCurrentNewsIndex((prev) => (prev + 1) % newsData.length)
  }

  const prevNews = () => {
    setCurrentNewsIndex((prev) => (prev - 1 + newsData.length) % newsData.length)
  }

  const handleRegister = () => {
    router.push('/register')
  }

  const handleLogin = () => {
    router.push('/login') 
  }

  const handlePlayClick = () => {
    if (isAuthenticated) {
      console.log('🎮 Redirecting to lobby (authenticated)')
      router.push('/lobby')
    } else {
      console.log('🔐 Redirecting to login (not authenticated)')
      router.push('/login')
    }
  }

  // Для отладки - показываем статус
  console.log('🏠 HomePage render - isAuthenticated:', isAuthenticated)

  return (
    <>
      <div className={styles.bg} aria-hidden />
      <div className={styles.bgFx} aria-hidden />
      
      <Fireflies />

      {/* ВАЖНО: TopMainHUD показывается ТОЛЬКО для авторизованных пользователей */}
      {isAuthenticated && userProfile && (
        <TopMainHUD 
          profile={{
            status: 'ok',
            userId: userProfile.id,
            email: userProfile.email,
            username: userProfile.username
          }}
          avatar={userProfile.avatar}
        />
      )}

      <div className={styles.container}>
        <section className={styles.leftSection}>
          <div className={styles.stationTitle}>
            <div className={styles.titleLine}>Станция Эдем</div>
          </div>

          <div className={styles.newsSliderContainer}>
            <button className={styles.sliderArrowLeft} onClick={prevNews}>
              ‹
            </button>

            <div className={styles.newsPanel}>
              <div className={styles.newsHeader}>
                <span className={styles.newsTitle}>{currentNews.title}</span>
                <span className={styles.newsDate}>Дата: {currentNews.date}</span>
              </div>
              <div className={styles.newsContent}>
                <p className={styles.newsInfo}>{currentNews.content}</p>
                <p className={styles.newsHighlight}>{currentNews.highlight}</p>
              </div>
            </div>

            <button className={styles.sliderArrowRight} onClick={nextNews}>
              ›
            </button>
          </div>
        </section>

        <section className={styles.menuSection}>
          {/* Кнопки регистрации и входа показываются ТОЛЬКО для неавторизованных */}
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
            <a 
              href="https://t.me/your-channel" 
              className={styles.socialIcon}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/icons/telegram.svg" alt="Telegram" />
            </a>
            <a 
              href="https://tiktok.com/@your-account" 
              className={styles.socialIcon}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/icons/tiktok.svg" alt="TikTok" />
            </a>
            <a 
              href="https://discord.gg/your-server" 
              className={styles.socialIcon}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/icons/discord.svg" alt="Discord" />
            </a>
          </div>
        </div>
      </div>
    </>
  )
}