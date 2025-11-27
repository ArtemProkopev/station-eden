// apps/web/src/components/TopHUD/components/UserDropdown.tsx
'use client'

import React from 'react'
import styles from './UserDropdown.module.css'
import { Avatar } from './Avatar'
import LogoutButton from './LogoutButton'

interface UserProfile {
  username?: string
  email?: string
  userId?: string
}

interface UserDropdownProps {
  profile: UserProfile
  avatar?: string
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onFriendsClick: () => void
  className?: string
}

export function UserDropdown({ 
  profile, 
  avatar, 
  isOpen, 
  onToggle, 
  onClose,
  onFriendsClick,
  className = '' 
}: UserDropdownProps) {
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleMenuItemClick = (action: string) => {
    console.log(`Selected: ${action}`)
    onClose()
    
    if (action === 'profile') {
      window.location.href = '/profile'
    } else if (action === 'settings') {
      window.location.href = '/settings'
    } else if (action === 'friends') {
      onFriendsClick()
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
    }
  }

  return (
    <nav 
      className={`${styles.dropdown} ${className}`.trim()}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
      aria-label="Меню пользователя"
    >
      <button
        type="button"
        className={styles.trigger}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Открыть меню пользователя"
      >
        <Avatar 
          src={avatar} 
          username={profile.username} 
          size="medium" 
        />
        
        <span className={`${styles.arrow} ${isOpen ? styles.arrowUp : ''}`}>
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
            <title>Индикатор открытия меню</title>
            <path 
              d="M1 1.5L6 6.5L11 1.5" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className={styles.menu} role="menu">
          {profile.username && (
            <div className={styles.userInfo} role="none">
              <strong className={styles.username}>{profile.username}</strong>
              {profile.email && (
                <span className={styles.email}>{profile.email}</span>
              )}
            </div>
          )}
          
          <hr className={styles.divider} />
          
          <button 
            className={styles.menuItem}
            onClick={() => handleMenuItemClick('profile')}
            role="menuitem"
          >
            Профиль
          </button>
          
          <button 
            className={styles.menuItem}
            onClick={() => handleMenuItemClick('settings')}
            role="menuitem"
          >
            Настройки
          </button>

          <button 
            className={styles.menuItem}
            onClick={() => handleMenuItemClick('friends')}
            role="menuitem"
          >
            Друзья
          </button>
          
          <hr className={styles.divider} />
          
          <div className={styles.logoutContainer} role="none">
            <LogoutButton />
          </div>
        </div>
      )}
    </nav>
  )
}