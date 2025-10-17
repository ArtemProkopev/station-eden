// apps/web/src/app/settings/hooks/useScrollPrevention.ts
'use client'

import { useEffect } from 'react'

export function useScrollPrevention() {
  useEffect(() => {
    const preventDefault = (e: Event) => {
      e.preventDefault()
    }
    
    const options = { passive: false }
    
    document.addEventListener('wheel', preventDefault, options)
    document.addEventListener('touchmove', preventDefault, options)
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    
    return () => {
      document.removeEventListener('wheel', preventDefault)
      document.removeEventListener('touchmove', preventDefault)
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])
}