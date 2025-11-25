// apps/web/src/hooks/useScrollPrevention.ts
'use client'

import { useEffect } from 'react'

type ScrollPreventionOptions = {
  /**
   * Запрещать ли скролл на тач устройствах
   * @default true
   */
  preventTouch?: boolean
  /**
   * Запрещать ли скролл колесом мыши
   * @default true
   */
  preventWheel?: boolean
  /**
   * Запрещать ли скролл через CSS overflow
   * @default true
   */
  preventOverflow?: boolean
}

/**
 * Хук для предотвращения скролла на странице
 * 
 * @example
 * // Базовое использование - запрещает весь скролл
 * useScrollPrevention()
 * 
 * @example
 * // Кастомные настройки - запрещает только тач скролл
 * useScrollPrevention({ preventWheel: false, preventTouch: true })
 */
export function useScrollPrevention(options: ScrollPreventionOptions = {}) {
  const {
    preventTouch = true,
    preventWheel = true,
    preventOverflow = true
  } = options

  useEffect(() => {
    const preventDefault = (e: Event) => {
      e.preventDefault()
    }
    
    const eventOptions = { passive: false }
    
    // Добавляем обработчики событий в зависимости от настроек
    if (preventWheel) {
      document.addEventListener('wheel', preventDefault, eventOptions)
    }
    
    if (preventTouch) {
      document.addEventListener('touchmove', preventDefault, eventOptions)
    }
    
    // Устанавливаем CSS стили
    if (preventOverflow) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    }
    
    return () => {
      // Убираем обработчики событий
      if (preventWheel) {
        document.removeEventListener('wheel', preventDefault)
      }
      
      if (preventTouch) {
        document.removeEventListener('touchmove', preventDefault)
      }
      
      // Восстанавливаем CSS стили
      if (preventOverflow) {
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''
      }
    }
  }, [preventTouch, preventWheel, preventOverflow])
}

// Для обратной совместимости - дефолтный экспорт
export default useScrollPrevention