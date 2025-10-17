// apps/web/src/app/settings/components/ui/SettingRow/SettingRow.tsx
'use client'

import React from 'react'
import styles from './SettingRow.module.css'

interface SettingRowProps {
  label: string
  children: React.ReactNode
  value?: string | number
  layout?: 'default' | 'select' | 'toggle'
  className?: string
}

export function SettingRow({ 
  label, 
  children, 
  value, 
  layout = 'default',
  className = ''
}: SettingRowProps) {
  const getLayoutClass = () => {
    switch (layout) {
      case 'select':
      case 'toggle':
        return styles.layoutCompact
      default:
        return styles.layoutDefault
    }
  }

  const layoutClass = getLayoutClass()
  const combinedClassName = `${styles.settingRow} ${layoutClass} ${className}`.trim()

  return (
    <div className={combinedClassName}>
      <span className={styles.settingName}>{label}</span>
      {children}
      {value !== undefined && (
        <span className={styles.settingValue}>{value}</span>
      )}
    </div>
  )
}