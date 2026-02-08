// apps/web/src/hooks/useScrollPrevention.ts
'use client'

import { useEffect } from 'react'

type ScrollPreventionOptions = {
  preventTouch?: boolean
  preventWheel?: boolean
  preventOverflow?: boolean
}

export function useScrollPrevention(options: ScrollPreventionOptions = {}) {
  const { preventTouch = true, preventWheel = true, preventOverflow = true } = options

  useEffect(() => {
    const preventDefault = (e: Event) => {
      e.preventDefault()
    }

    const eventOptions = { passive: false } as AddEventListenerOptions

    if (preventWheel) {
      document.addEventListener('wheel', preventDefault, eventOptions)
    }

    if (preventTouch) {
      document.addEventListener('touchmove', preventDefault, eventOptions)
    }

    if (preventOverflow) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    }

    return () => {
      if (preventWheel) {
        document.removeEventListener('wheel', preventDefault)
      }

      if (preventTouch) {
        document.removeEventListener('touchmove', preventDefault)
      }

      if (preventOverflow) {
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''
      }
    }
  }, [preventTouch, preventWheel, preventOverflow])
}
