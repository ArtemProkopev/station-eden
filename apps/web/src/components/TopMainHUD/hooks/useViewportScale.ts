// apps/web/src/components/TopHUD/hooks/useViewportScale.ts
import { useState, useEffect } from 'react'

export function useViewportScale() {
  const [scale, setScale] = useState(1)

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

  return scale
}