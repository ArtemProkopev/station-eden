// apps/web/src/components/TopHUD/components/Avatar.tsx
'use client'

import React from 'react'
import styles from './Avatar.module.css'
import { Icon } from './Icon'

interface AvatarProps {
  src?: string
  alt?: string
  username?: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function Avatar({ src, alt, username, size = 'medium', className = '' }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)
  
  const combinedClassName = `${styles.avatar} ${styles[`size-${size}`]} ${className}`.trim()
  const displayAlt = alt || (username ? `Аватар пользователя ${username}` : 'Аватар пользователя')

  const handleError = () => {
    setImgError(true)
  }

  if (!src || imgError) {
    return (
      <span className={combinedClassName} role="img" aria-label={displayAlt}>
        <Icon 
          type="avatar" 
          size={size} 
          aria-hidden={true}
        />
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={displayAlt}
      className={combinedClassName}
      onError={handleError}
    />
  )
}