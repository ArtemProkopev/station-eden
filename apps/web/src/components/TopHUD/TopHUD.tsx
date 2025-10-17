// apps/web/src/components/TopHUD/TopHUD.tsx
'use client'

import React, { useEffect, useState, useRef } from 'react'
import styles from './TopHUD.module.css'
import LogoutButton from './LogoutButton'
import { useUserData } from '../../hooks/useUserData'

interface TopHUDProps {
  profile?: {
    status: 'loading' | 'error' | 'ok' | 'unauth';
    userId?: string;
    email?: string;
    username?: string | null;
    message?: string;
  };
  avatar?: string;
}

const ICONS = {
  rocket: '/icons/rocket.svg',
  star:   '/icons/star.svg',
  avatar: '/icons/avatar-placeholder.svg',
}

const FALLBACKS = {
  rocket: (
    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden>
      <path fill="#63EFFF" d="M12 2s4 1 6 3 3 6 3 6-3 0-6-2-6-6-6-6z" opacity="0.95"/>
    </svg>
  ),
  avatar: (
    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#63EFFF" opacity="0.8"/>
      <circle cx="12" cy="9" r="3" fill="#204C72"/>
      <path fill="#204C72" d="M12 14c-3 0-6 1.5-6 4.5v1h12v-1c0-3-3-4.5-6-4.5z"/>
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="#63EFFF" d="M12 17.3 6.6 20l1.2-6.9L2 9.3l6.9-1L12 2l3.1 6.3 6.9 1-5.8 3.8L17.4 20z"/>
    </svg>
  ),
}

export default function TopHUD({ profile, avatar }: TopHUDProps) {
  const [ok, setOk] = useState<{[k: string]: boolean}>({})
  const [scale, setScale] = useState(1)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const userData = useUserData()
  
  const finalAvatar = avatar || userData.avatar
  const finalProfile = profile || {
    status: userData.status === 'ok' ? 'ok' : 
            userData.status === 'error' ? 'error' : 'loading',
    username: userData.username,
    email: userData.email,
    userId: userData.userId
  }
  
  console.log('finalAvatar:', finalAvatar)
  console.log('finalProfile:', finalProfile)
  console.log('finalProfile.username:', finalProfile.username)
  console.log('================')

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const updateScale = () => {
      const width = window.innerWidth
      
      if (width >= 1200) {
        setScale(1)
      } else if (width >= 1000) {
        setScale(0.9)
      } else if (width >= 800) {
        setScale(0.8)
      } else if (width >= 600) {
        setScale(0.7)
      } else if (width >= 400) {
        setScale(0.6)
      } else {
        setScale(0.5)
      }
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  useEffect(() => {
    Object.entries(ICONS).forEach(([key, url]) => {
      fetch(url, { method: 'HEAD' })
        .then(res => {
          console.log(`[TopHUD] ${url} -> ${res.status}`)
          setOk(prev => ({ ...prev, [key]: res.ok }))
        })
        .catch(err => {
          console.error('[TopHUD] fetch error for', url, err)
          setOk(prev => ({ ...prev, [key]: false }))
        })
    })
  }, [])

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const handleMenuItemClick = (action: string) => {
    console.log(`Selected: ${action}`)
    setIsDropdownOpen(false)
    
    if (action === 'profile') {
      window.location.href = '/profile'
    } else if (action === 'settings') {
      window.location.href = '/settings'
    }
  }

  const hudStyle = {
    transform: `scale(${scale})`,
    transformOrigin: 'top center',
  } as React.CSSProperties

  return (
    <div className={styles.hud} style={hudStyle}>
      <a href="/" className={styles.backLink} aria-label="На главную">
        {ok.rocket ? (
          <img
            className={styles.icon}
            src={ICONS.rocket}
            alt="Ракета"
            onError={(e) => {
              console.error('img onError', (e.target as HTMLImageElement).src)
              setOk(prev => ({ ...prev, rocket: false }))
            }}
          />
        ) : (
          FALLBACKS.rocket
        )}

        <span className={styles.backText}>на главную</span>
      </a>

      <div className={styles.hudRight}>
        <div className={styles.currency} title="Валюта" aria-hidden>
          <span className={styles.backText}>128</span>
          <div className={styles.currencyContent}>
            {ok.star ? (
              <img className={styles.star} src={ICONS.star} alt="Звезда" />
            ) : (
              FALLBACKS.star
            )}
            <button className={styles.plusButton} aria-label="Добавить валюту"></button>
          </div>
        </div>

        <div className={styles.avatarDropdown} ref={dropdownRef}>
          <button 
            className={styles.avatarButton}
            onClick={toggleDropdown}
            aria-label="Меню пользователя"
            aria-expanded={isDropdownOpen}
          >
            <div className={styles.avatarContainer}>
              {finalAvatar && finalAvatar !== '/icons/avatar-placeholder.svg' ? (
                <img 
                  className={styles.avatarIcon} 
                  src={finalAvatar} 
                  alt={`Аватар ${finalProfile.username || ''}`}
                  onError={(e) => {
                    console.error('Avatar failed to load, using fallback')
                    const target = e.target as HTMLImageElement
                    if (ok.avatar) {
                      target.src = ICONS.avatar
                    } else {
                      target.style.display = 'none'
                    }
                  }}
                />
              ) : ok.avatar ? (
                <img 
                  className={styles.avatarIcon} 
                  src={ICONS.avatar} 
                  alt="Аватар" 
                  onError={(e) => {
                    console.error('Fallback avatar failed to load')
                    setOk(prev => ({ ...prev, avatar: false }))
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                FALLBACKS.avatar
              )}
            </div>
            <div className={`${styles.arrow} ${isDropdownOpen ? styles.arrowUp : ''}`}>
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                <path d="M1 1.5L6 6.5L11 1.5" stroke="#63EFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>

          {isDropdownOpen && (
            <div className={styles.dropdownMenu}>
              {finalProfile.username && (
                <div className={styles.userInfo}>
                  {finalProfile.username}
                </div>
              )}
              <button 
                className={styles.menuItem}
                onClick={() => handleMenuItemClick('profile')}
              >
                Профиль
              </button>
              <button 
                className={styles.menuItem}
                onClick={() => handleMenuItemClick('settings')}
              >
                Настройки
              </button>
              <LogoutButton />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}