// apps/web/src/app/settings/components/SettingsContent/SettingsContent.tsx
'use client'

import React from 'react'
import styles from './SettingsContent.module.css'
import { SoundSettings, SoundSettingsType } from '../sections/SoundSettings/SoundSettings'
import { LanguageSettings } from '../sections/LanguageSettings/LanguageSettings'
import { SessionsSettings } from '../sections/SessionsSettings/SessionsSettings'
import { PurchasesSettings } from '../sections/PurchasesSettings/PurchasesSettings'
import { SettingsSection } from '../SettingsSidebar/SettingsSidebar'
import { SettingsType } from '../../types'

interface SettingsContentProps {
  activeSection: SettingsSection
  settings: SettingsType
  onVolumeChange: (type: keyof SoundSettingsType, value: number) => void
  onDeviceChange: (device: string) => void
  onToggleChange: (setting: string, value: boolean) => void
  onLanguageChange: (language: string) => void
  onSessionHistoryChange: (enabled: boolean) => void
  onPurchaseHistoryChange: (enabled: boolean) => void
}

export function SettingsContent({
  activeSection,
  settings,
  onVolumeChange,
  onDeviceChange,
  onToggleChange,
  onLanguageChange,
  onSessionHistoryChange,
  onPurchaseHistoryChange
}: SettingsContentProps) {
  const renderContent = () => {
    switch (activeSection) {
      case 'sound':
        return (
          <SoundSettings
            settings={settings.sound}
            onVolumeChange={onVolumeChange}
            onDeviceChange={onDeviceChange}
            onToggleChange={onToggleChange}
          />
        )
      case 'language':
        return (
          <LanguageSettings
            language={settings.language}
            onChange={onLanguageChange}
          />
        )
      case 'sessions':
        return (
          <SessionsSettings
            sessionHistory={settings.sessionHistory}
            onChange={onSessionHistoryChange}
          />
        )
      case 'purchases':
        return (
          <PurchasesSettings
            purchaseHistory={settings.purchaseHistory}
            onChange={onPurchaseHistoryChange}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className={styles.content}>
      <div className={styles.contentSection}>
        {renderContent()}
      </div>
    </div>
  )
}