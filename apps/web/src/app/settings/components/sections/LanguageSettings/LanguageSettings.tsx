// apps/web/src/app/settings/components/sections/LanguageSettings/LanguageSettings.tsx
'use client'

import React from 'react'
import styles from './LanguageSettings.module.css'
import { SettingRow } from '../../ui/SettingRow/SettingRow'
import { SelectDropdown } from '../../ui/SelectDropdown/SelectDropdown'

interface LanguageSettingsProps {
  language: string
  onChange: (language: string) => void
}

const LANGUAGES = [
  { value: 'russian', label: 'Русский' },
  { value: 'english', label: 'English' }
]

export function LanguageSettings({ language, onChange }: LanguageSettingsProps) {
  return (
    <div className={styles.languageSettings}>
      <SettingRow 
        label="Язык интерфейса" 
        layout="select"
      >
        <SelectDropdown
          value={language}
          onChange={onChange}
          options={LANGUAGES}
          aria-label="Язык интерфейса"
        />
      </SettingRow>
    </div>
  )
}