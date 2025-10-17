// apps/web/src/app/settings/components/sections/SoundSettings/SoundSettings.tsx
'use client'

import React from 'react'
import styles from './SoundSettings.module.css'
import { SettingRow } from '../../ui/SettingRow/SettingRow'
import { VolumeSlider } from '../../ui/VolumeSlider/VolumeSlider'
import { SelectDropdown } from '../../ui/SelectDropdown/SelectDropdown'
import { ToggleSwitch } from '../../ui/ToggleSwitch/ToggleSwitch'

export interface SoundSettingsType {
  masterVolume: number
  musicVolume: number
  effectsVolume: number
  outputDevice: string
  muteWhenMinimized: boolean
}

interface SoundSettingsProps {
  settings: SoundSettingsType
  onVolumeChange: (type: keyof SoundSettingsType, value: number) => void
  onDeviceChange: (device: string) => void
  onToggleChange: (setting: 'muteWhenMinimized', value: boolean) => void
}

const OUTPUT_DEVICES = [
  { value: 'headphones', label: 'Наушники' },
  { value: 'speakers', label: 'Колонки' }
]

export function SoundSettings({ 
  settings, 
  onVolumeChange, 
  onDeviceChange, 
  onToggleChange 
}: SoundSettingsProps) {
  return (
    <div className={styles.soundSettings}>
      <SettingRow 
        label="Общая громкость" 
        value={settings.masterVolume}
        className={styles.settingRow}
      >
        <VolumeSlider
          value={settings.masterVolume}
          onChange={(value) => onVolumeChange('masterVolume', value)}
          aria-label="Общая громкость"
        />
      </SettingRow>

      <SettingRow 
        label="Громкость музыки" 
        value={settings.musicVolume}
        className={styles.settingRow}
      >
        <VolumeSlider
          value={settings.musicVolume}
          onChange={(value) => onVolumeChange('musicVolume', value)}
          aria-label="Громкость музыки"
        />
      </SettingRow>

      <SettingRow 
        label="Громкость эффектов" 
        value={settings.effectsVolume}
        className={styles.settingRow}
      >
        <VolumeSlider
          value={settings.effectsVolume}
          onChange={(value) => onVolumeChange('effectsVolume', value)}
          aria-label="Громкость эффектов"
        />
      </SettingRow>

      <SettingRow 
        label="Устройство воспроизведения" 
        layout="select"
        className={styles.settingRow}
      >
        <SelectDropdown
          value={settings.outputDevice}
          onChange={onDeviceChange}
          options={OUTPUT_DEVICES}
          aria-label="Устройство воспроизведения"
        />
      </SettingRow>

      <SettingRow 
        label="Без звуков при свернутой игре" 
        layout="toggle"
        className={styles.settingRow}
      >
        <ToggleSwitch
          checked={settings.muteWhenMinimized}
          onChange={(value) => onToggleChange('muteWhenMinimized', value)}
          aria-label="Без звуков при свернутой игре"
        />
      </SettingRow>
    </div>
  )
}