// apps/web/src/app/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import TopHUD from '../../components/TopHUD/TopHUD'
import { ScaleContainer } from '../../components/ui/ScaleContainer/ScaleContainer'
import { useSettings } from './hooks/useSettings'
import { useScrollPrevention } from './hooks/useScrollPrevention'
import styles from './page.module.css'

type SettingsSection = 'sound' | 'language' | 'sessions' | 'purchases'

const MENU_ITEMS: { id: SettingsSection; label: string }[] = [
  { id: 'sound', label: 'Звук' },
  { id: 'language', label: 'Язык' },
  { id: 'sessions', label: 'Сессии' },
  { id: 'purchases', label: 'История покупок' }
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('sound')
  
  const {
    profile,
    avatar,
    settings,
    loadUserData,
    loadSettings,
    updateSettings,
    updateSoundSettings
  } = useSettings()

  useScrollPrevention()

  // Инициализация данных
  useEffect(() => {
    const initializeData = async () => {
      await loadUserData()
      loadSettings()
    }
    initializeData()
  }, [loadUserData, loadSettings])


  const handleVolumeChange = (type: keyof typeof settings.sound, value: number) => {
    updateSoundSettings({ [type]: value })
  }

  const handleDeviceChange = (device: string) => {
    updateSoundSettings({ outputDevice: device })
  }

  const handleToggleChange = (setting: keyof typeof settings | keyof typeof settings.sound, value: boolean) => {
    if (setting === 'muteWhenMinimized') {
      updateSoundSettings({ muteWhenMinimized: value })
    } else if (setting === 'sessionHistory' || setting === 'purchaseHistory') {
      updateSettings({ [setting]: value })
    }
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'sound':
        return (
          <div className={styles.contentSection}>
            <div className={styles.settingRow}>
              <span className={styles.settingName}>Общая громкость</span>
              <div className={styles.sliderContainer}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sound.masterVolume}
                  onChange={(e) => handleVolumeChange('masterVolume', parseInt(e.target.value))}
                  className={styles.slider}
                />
              </div>
              <span className={styles.settingValue}>{settings.sound.masterVolume}</span>
            </div>

            <div className={styles.settingRow}>
              <span className={styles.settingName}>Громкость музыки</span>
              <div className={styles.sliderContainer}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sound.musicVolume}
                  onChange={(e) => handleVolumeChange('musicVolume', parseInt(e.target.value))}
                  className={styles.slider}
                />
              </div>
              <span className={styles.settingValue}>{settings.sound.musicVolume}</span>
            </div>

            <div className={styles.settingRow}>
              <span className={styles.settingName}>Громкость эффектов</span>
              <div className={styles.sliderContainer}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sound.effectsVolume}
                  onChange={(e) => handleVolumeChange('effectsVolume', parseInt(e.target.value))}
                  className={styles.slider}
                />
              </div>
              <span className={styles.settingValue}>{settings.sound.effectsVolume}</span>
            </div>

            <div className={styles.settingRow}>
              <span className={styles.settingName}>Устройство воспроизведения</span>
              <select
                value={settings.sound.outputDevice}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className={styles.select}
              >
                <option value="headphones">Наушники</option>
                <option value="speakers">Колонки</option>
              </select>
            </div>

            <div className={styles.settingRow}>
              <span className={styles.settingName}>Без звуков при свернутой игре</span>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={settings.sound.muteWhenMinimized}
                  onChange={(e) => handleToggleChange('muteWhenMinimized', e.target.checked)}
                  className={styles.toggleInput}
                />
                <span className={styles.toggleSlider}>
                  <span className={styles.toggleText}>
                    {settings.sound.muteWhenMinimized ? 'Вкл' : 'Выкл'}
                  </span>
                </span>
              </label>
            </div>
          </div>
        )

      case 'language':
        return (
          <div className={styles.contentSection}>
            <div className={styles.settingRow}>
              <span className={styles.settingName}>Язык интерфейса</span>
              <select
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value })}
                className={styles.select}
              >
                <option value="russian">Русский</option>
                <option value="english">English</option>
              </select>
            </div>
          </div>
        )

      case 'sessions':
        return (
          <div className={styles.contentSection}>
            <div className={styles.settingRow}>
              <span className={styles.settingName}>История сессий</span>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={settings.sessionHistory}
                  onChange={(e) => handleToggleChange('sessionHistory', e.target.checked)}
                  className={styles.toggleInput}
                />
                <span className={styles.toggleSlider}>
                  <span className={styles.toggleText}>
                    {settings.sessionHistory ? 'Вкл' : 'Выкл'}
                  </span>
                </span>
              </label>
            </div>
          </div>
        )

      case 'purchases':
        return (
          <div className={styles.contentSection}>
            <div className={styles.settingRow}>
              <span className={styles.settingName}>История покупок</span>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={settings.purchaseHistory}
                  onChange={(e) => handleToggleChange('purchaseHistory', e.target.checked)}
                  className={styles.toggleInput}
                />
                <span className={styles.toggleSlider}>
                  <span className={styles.toggleText}>
                    {settings.purchaseHistory ? 'Вкл' : 'Выкл'}
                 </span>
                </span>
              </label>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <main className={styles.root}>
      <TopHUD profile={profile} avatar={avatar} />
      
      <ScaleContainer
        baseWidth={1200}
        baseHeight={800}
        minScale={0.5}
        maxScale={1}
      >
        <div className={styles.container}>
          <div className={styles.layout}>
            <nav className={styles.sidebar}>
              <ul className={styles.menu}>
                {MENU_ITEMS.map((item) => (
                  <li key={item.id} className={styles.menuItem}>
                    <button
                      className={`${styles.menuButton} ${
                        activeSection === item.id ? styles.menuButtonActive : ''
                      }`}
                      onClick={() => setActiveSection(item.id)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className={styles.content}>
              {renderContent()}
            </div>
          </div>
        </div>
      </ScaleContainer>
    </main>
  )
}