// apps/web/src/app/settings/components/sections/PurchasesSettings/PurchasesSettings.tsx
'use client'

import React from 'react'
import styles from './PurchasesSettings.module.css'
import { SettingRow } from '../../ui/SettingRow/SettingRow'
import { ToggleSwitch } from '../../ui/ToggleSwitch/ToggleSwitch'

interface PurchasesSettingsProps {
  purchaseHistory: boolean
  onChange: (enabled: boolean) => void
}

export function PurchasesSettings({ purchaseHistory, onChange }: PurchasesSettingsProps) {
  return (
    <div className={styles.purchasesSettings}>
      <SettingRow 
        label="История покупок" 
        layout="toggle"
      >
        <ToggleSwitch
          checked={purchaseHistory}
          onChange={onChange}
          aria-label="История покупок"
        />
      </SettingRow>
    </div>
  )
}