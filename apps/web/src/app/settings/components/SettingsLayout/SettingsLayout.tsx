// apps/web/src/app/settings/components/SettingsLayout/SettingsLayout.tsx
'use client'

import React from 'react'
import styles from './SettingsLayout.module.css'

interface SettingsLayoutProps {
  sidebar: React.ReactNode
  content: React.ReactNode
}

export function SettingsLayout({ sidebar, content }: SettingsLayoutProps) {
  return (
    <div className={styles.layout}>
      {sidebar}
      {content}
    </div>
  )
}