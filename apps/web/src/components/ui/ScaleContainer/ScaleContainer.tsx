// apps/web/src/components/ui/ScaleContainer/ScaleContainer.tsx
'use client'

import { useEffect, useState } from 'react'
import styles from './ScaleContainer.module.css'

interface ScaleContainerProps {
  children: React.ReactNode
  baseWidth?: number
  baseHeight?: number
  minScale?: number
  maxScale?: number
  className?: string
}

export const ScaleContainer = ({
  children,
  baseWidth = 1200,
  baseHeight = 800,
  minScale = 0.5,
  maxScale = 1,
  className = ''
}: ScaleContainerProps) => {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const updateScale = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      const widthScale = (width - 40) / baseWidth
      const heightScale = (height - 40) / baseHeight
      
      const newScale = Math.min(widthScale, heightScale)
      setScale(Math.max(minScale, Math.min(newScale, maxScale)))
    }
    
    updateScale()
    window.addEventListener('resize', updateScale)
    
    return () => window.removeEventListener('resize', updateScale)
  }, [baseWidth, baseHeight, minScale, maxScale])

  return (
    <div 
      className={`${styles.scaleContainer} ${className}`}
      style={{ 
        transform: `scale(${scale})`,
        transformOrigin: 'center top'
      }}
    >
      {children}
    </div>
  )
}