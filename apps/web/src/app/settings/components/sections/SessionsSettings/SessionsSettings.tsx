// apps/web/src/app/settings/components/sections/SessionsSettings/SessionsSettings.tsx
'use client'

import React from 'react'
import styles from './SessionsSettings.module.css'
import { SettingRow } from '../../ui/SettingRow/SettingRow'
import { ToggleSwitch } from '../../ui/ToggleSwitch/ToggleSwitch'

interface SessionsSettingsProps {
  sessionHistory: boolean
  onChange: (enabled: boolean) => void
}

export function SessionsSettings({ sessionHistory, onChange }: SessionsSettingsProps) {
  return (
    <div className={styles.sessionsSettings}>
      <SettingRow 
        label="История сессий" 
        layout="toggle"
      >
        <ToggleSwitch
          checked={sessionHistory}
          onChange={onChange}
          aria-label="История сессий"
        />
      </SettingRow>
    </div>
  )
}