// apps/web/src/app/settings/components/ui/ToggleSwitch/ToggleSwitch.tsx
'use client'

import React from 'react'
import styles from './ToggleSwitch.module.css'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  'aria-label'?: string
}

export function ToggleSwitch({ checked, onChange, disabled = false, ...props }: ToggleSwitchProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked)
  }

  return (
    <label className={styles.toggleLabel}>
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className={styles.toggleInput}
        {...props}
      />
      <span className={styles.toggleSlider}>
        <span className={styles.toggleText}>
          {checked ? 'Вкл' : 'Выкл'}
        </span>
      </span>
    </label>
  )
}