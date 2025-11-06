// apps/web/src/components/TopHUD/components/Currency.tsx
'use client'

import React from 'react'
import styles from './Currency.module.css'
import { Icon } from './Icon'

interface CurrencyProps {
  value: number
  onAdd?: () => void
  className?: string
}

export function Currency({ value, onAdd, className = '' }: CurrencyProps) {
  const formattedValue = new Intl.NumberFormat('ru-RU').format(value)
  
  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onAdd?.()
  }

  return (
    <div className={`${styles.currency} ${className}`.trim()}>
      <span className={styles.value}>{formattedValue}</span>
      
      <div className={styles.content}>
        <Icon 
          type="star" 
          size="small" 
          alt="Звезда" 
          aria-hidden={true}  // ← Исправлено: boolean вместо string
        />
        
        <button
          type="button"
          className={styles.addButton}
          onClick={handleAddClick}
          aria-label="Добавить валюту"
          title="Добавить валюту"
        >
          <span className={styles.plusIcon}>+</span>
        </button>
      </div>
    </div>
  )
}