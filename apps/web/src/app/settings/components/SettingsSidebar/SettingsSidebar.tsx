// apps/web/src/app/settings/components/SettingsSidebar/SettingsSidebar.tsx
'use client'

import React from 'react'
import styles from './SettingsSidebar.module.css'

export type SettingsSection = 'sound' | 'language' | 'sessions' | 'purchases'

interface SettingsSidebarProps {
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}

const MENU_ITEMS: { id: SettingsSection; label: string }[] = [
  { id: 'sound', label: 'Звук' },
  { id: 'language', label: 'Язык' },
  { id: 'sessions', label: 'Сессии' },
  { id: 'purchases', label: 'История покупок' }
]

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <nav className={styles.sidebar} aria-label="Настройки">
      <ul className={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <li key={item.id} className={styles.menuItem}>
            <button
              className={`${styles.menuButton} ${
                activeSection === item.id ? styles.menuButtonActive : ''
              }`}
              onClick={() => onSectionChange(item.id)}
              aria-current={activeSection === item.id ? 'page' : undefined}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}