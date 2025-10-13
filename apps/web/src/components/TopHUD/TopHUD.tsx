// apps/web/src/components/TopHUD/TopHUD.tsx
'use client'

import React, { useEffect, useState } from 'react'
import styles from './TopHUD.module.css'

const ICONS = {
  rocket: '/icons/rocket.svg',
  star:   '/icons/star.svg',
  gear:   '/icons/settings.svg',
}

const FALLBACKS = {
  rocket: (
    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden>
      <path fill="#63EFFF" d="M12 2s4 1 6 3 3 6 3 6-3 0-6-2-6-6-6-6z" opacity="0.95"/>
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <circle cx="12" cy="12" r="3" fill="#63EFFF"/>
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="#63EFFF" d="M12 17.3 6.6 20l1.2-6.9L2 9.3l6.9-1L12 2l3.1 6.3 6.9 1-5.8 3.8L17.4 20z"/>
    </svg>
  ),
}

export default function TopHUD() {
  const [ok, setOk] = useState<{[k: string]: boolean}>({})

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

  return (
    <div className={styles.hud}>
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

        {ok.gear ? (
          <img className={styles.gearIcon} src={ICONS.gear} alt="Настройки" />
        ) : (
          FALLBACKS.gear
        )}
      </div>
    </div>
  )
}