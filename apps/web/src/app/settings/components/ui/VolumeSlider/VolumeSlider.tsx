// apps/web/src/app/settings/components/ui/VolumeSlider/VolumeSlider.tsx
'use client'

import React from 'react'
import styles from './VolumeSlider.module.css'

interface VolumeSliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  'aria-label'?: string
}

export function VolumeSlider({ 
  value, 
  onChange, 
  min = 0, 
  max = 100, 
  ...props 
}: VolumeSliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value))
  }

  return (
    <div className={styles.sliderContainer}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        className={styles.slider}
        {...props}
      />
    </div>
  )
}