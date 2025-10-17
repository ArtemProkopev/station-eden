// apps/web/src/components/TopHUD/components/Icon.tsx
'use client'

import React from 'react'
import styles from './Icon.module.css'

export type IconType = 'rocket' | 'star' | 'avatar'
export type IconSize = 'small' | 'medium' | 'large'

interface IconProps {
  type: IconType
  size?: IconSize
  alt?: string
  className?: string
  'aria-hidden'?: boolean
}

const FALLBACKS: Record<IconType, React.ReactNode> = {
  rocket: (
    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
      <title>Ракета</title>
      <path fill="#63EFFF" d="M12 2s4 1 6 3 3 6 3 6-3 0-6-2-6-6-6-6z" opacity="0.95"/>
    </svg>
  ),
  avatar: (
    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
      <title>Аватар пользователя</title>
      <circle cx="12" cy="12" r="10" fill="#63EFFF" opacity="0.8"/>
      <circle cx="12" cy="9" r="3" fill="#204C72"/>
      <path fill="#204C72" d="M12 14c-3 0-6 1.5-6 4.5v1h12v-1c0-3-3-4.5-6-4.5z"/>
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <title>Звезда</title>
      <path fill="#63EFFF" d="M12 17.3 6.6 20l1.2-6.9L2 9.3l6.9-1L12 2l3.1 6.3 6.9 1-5.8 3.8L17.4 20z"/>
    </svg>
  ),
}

const ICON_PATHS: Record<IconType, string> = {
  rocket: '/icons/rocket.svg',
  star: '/icons/star.svg',
  avatar: '/icons/avatar-placeholder.svg',
}

interface IconLoaderProps {
  type: IconType
  onLoadStatus?: (loaded: boolean) => void
  alt?: string
  className?: string
  'aria-hidden'?: boolean
}

function IconLoader({ type, onLoadStatus, alt, className, ...props }: IconLoaderProps) {
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    if (isLoaded) {
      onLoadStatus?.(true)
    }
  }, [isLoaded, onLoadStatus])

  const handleError = () => {
    setHasError(true)
    onLoadStatus?.(false)
  }

  const handleLoad = () => {
    setIsLoaded(true)
  }

  if (hasError) {
    return <>{FALLBACKS[type]}</>
  }

  return (
    <img
      src={ICON_PATHS[type]}
      alt={alt}
      className={className}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  )
}

export function Icon({ 
  type, 
  size = 'medium', 
  alt, 
  className = '', 
  'aria-hidden': ariaHidden, 
  ...props 
}: IconProps) {
  const [isReady, setIsReady] = React.useState(false)
  
  const sizeClass = styles[`size-${size}`]
  const combinedClassName = `${styles.icon} ${sizeClass} ${className}`.trim()

  // Для SSR сразу показываем fallback, затем пытаемся загрузить иконку
  React.useEffect(() => {
    setIsReady(true)
  }, [])

  if (!isReady) {
    return (
      <span 
        className={combinedClassName} 
        role="img" 
        aria-hidden={ariaHidden}
        {...props}
      >
        {FALLBACKS[type]}
      </span>
    )
  }

  return (
    <span 
      className={combinedClassName} 
      role="img" 
      aria-hidden={ariaHidden}
      {...props}
    >
      <IconLoader
        type={type}
        onLoadStatus={(loaded) => !loaded && setIsReady(true)}
        alt={alt}
        className={styles.iconImage}
        aria-hidden={ariaHidden}
      />
    </span>
  )
}