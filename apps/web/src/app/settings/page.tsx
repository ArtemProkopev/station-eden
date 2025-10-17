// apps/web/src/app/settings/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import TopHUD from '../../components/TopHUD/TopHUD'
import { ScaleContainer } from '../../components/ui/ScaleContainer/ScaleContainer'
import styles from './page.module.css'

interface SettingsData {
  sound: {
    masterVolume: number
    musicVolume: number
    effectsVolume: number
    outputDevice: string
    muteWhenMinimized: boolean
  }
  language: string
  sessionHistory: boolean
  purchaseHistory: boolean
}

type SettingsSection = 'sound' | 'language' | 'sessions' | 'purchases'

const DEFAULT_SETTINGS: SettingsData = {
  sound: {
    masterVolume: 63,
    musicVolume: 63,
    effectsVolume: 63,
    outputDevice: 'headphones',
    muteWhenMinimized: true
  },
  language: 'russian',
  sessionHistory: true,
  purchaseHistory: true
}

const MENU_ITEMS: { id: SettingsSection; label: string }[] = [
  { id: 'sound', label: 'Звук' },
  { id: 'language', label: 'Язык' },
  { id: 'sessions', label: 'Сессии' },
  { id: 'purchases', label: 'История покупок' }
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS)
  const [activeSection, setActiveSection] = useState<SettingsSection>('sound')
  const [profile, setProfile] = useState({ status: 'loading' as const })

  // Загрузка настроек из localStorage
  useEffect(() => {
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem('user_settings')
        if (saved) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) })
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }

    loadSettings()
  }, [])

  // Сохранение настроек в localStorage
  const saveSettings = useCallback((newSettings: SettingsData) => {
    try {
      localStorage.setItem('user_settings', JSON.stringify(newSettings))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }, [])

  const updateSettings = useCallback((updates: Partial<SettingsData>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates }
      saveSettings(newSettings)
      return newSettings
    })
  }, [saveSettings])

  const updateSoundSettings = useCallback((updates: Partial<SettingsData['sound']>) => {
    setSettings(prev => {
      const newSoundSettings = { ...prev.sound, ...updates }
      const newSettings = { ...prev, sound: newSoundSettings }
      saveSettings(newSettings)
      return newSettings
    })
  }, [saveSettings])

  // Предотвращение прокрутки
  useEffect(() => {
    const preventDefault = (e: Event) => {
      e.preventDefault()
    }
    const options = { passive: false }
    document.addEventListener('wheel', preventDefault, options)
    document.addEventListener('touchmove', preventDefault, options)
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('wheel', preventDefault)
      document.removeEventListener('touchmove', preventDefault)
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  const handleVolumeChange = (type: keyof SettingsData['sound'], value: number) => {
    updateSoundSettings({ [type]: value })
  }

  const handleDeviceChange = (device: string) => {
    updateSoundSettings({ outputDevice: device })
  }

  const handleToggleChange = (setting: keyof SettingsData['sound'] | keyof SettingsData, value: boolean) => {
    if (setting === 'muteWhenMinimized') {
      updateSoundSettings({ muteWhenMinimized: value })
    } else {
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
      <TopHUD profile={profile} />

      <ScaleContainer
        baseWidth={1200}
        baseHeight={800}
        minScale={0.5}
        maxScale={1}
      >
        <div className={styles.container}>
          <div className={styles.layout}>
            {/* Левое меню */}
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

            {/* Правая часть с контентом */}
            <div className={styles.content}>
              {renderContent()}
            </div>
          </div>
        </div>
      </ScaleContainer>
    </main>
  )
}