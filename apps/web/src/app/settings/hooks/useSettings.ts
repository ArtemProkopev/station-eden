// apps/web/src/app/settings/hooks/useSettings.ts
'use client'

import { useState, useCallback } from 'react'
import { ProfileData } from '../../profile/types'
import { asset } from '@/lib/asset'
import { PROFILE_CONFIG } from '../../profile/config'

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

const migrateToAbsoluteUrl = (url: string | null): string | undefined => {
  if (!url) return undefined;
  return url.startsWith('http') ? url : asset(url);
};

export function useSettings() {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS)
  const [profile, setProfile] = useState<ProfileData>({ status: 'loading' })
  const [avatar, setAvatar] = useState<string>('/icons/avatar-placeholder.svg')

  const loadSavedAvatar = useCallback(() => {
    console.log('🔄 START loadSavedAvatar')
    try {
      const savedAvatar = localStorage.getItem(PROFILE_CONFIG.STORAGE_KEYS.AVATAR)
      const userAvatar = localStorage.getItem('user_avatar')
      
      console.log('📁 Avatar sources:', {
        profileStorage: savedAvatar,
        userStorage: userAvatar
      })

      let finalAvatar = migrateToAbsoluteUrl(savedAvatar) || 
                       migrateToAbsoluteUrl(userAvatar) || 
                       asset(PROFILE_CONFIG.DEFAULT.AVATAR)

      console.log('✅ Final avatar URL:', finalAvatar)
      setAvatar(finalAvatar)

      fetch(finalAvatar, { method: 'HEAD' })
        .then(res => {
          console.log(`Avatar availability: ${finalAvatar} -> ${res.status}`)
          if (!res.ok) {
            console.warn('Avatar not available, using fallback')
            setAvatar(asset(PROFILE_CONFIG.DEFAULT.AVATAR))
          }
        })
        .catch(err => {
          console.error('Avatar fetch error:', err)
          setAvatar(asset(PROFILE_CONFIG.DEFAULT.AVATAR))
        })

    } catch (error) {
      console.error('Error loading avatar:', error)
      setAvatar(asset(PROFILE_CONFIG.DEFAULT.AVATAR))
    }
  }, [])

  // Загрузка пользовательских данных
  const loadUserData = useCallback(async () => {
    console.log('🔄 START loadUserData')
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
      console.log('🌐 Fetching from:', `${API_BASE}/auth/me`)
      
      const response = await fetch(`${API_BASE}/auth/me`, {
        credentials: 'include',
        cache: 'no-store',
      })

      console.log('📡 Response status:', response.status)

      if (response.status === 401) {
        console.warn('Unauthorized')
        setProfile({
          status: 'unauth',
          message: 'Вы не авторизованы.',
        })
        return
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      console.log('Response data:', data)
      
      const payload = data?.data ?? data
      const { userId, email, username = null } = payload

      console.log('User data:', { userId, email, username })

      if (typeof userId === 'string' && typeof email === 'string') {
        setProfile({ status: 'ok', userId, email, username })
        console.log('User data loaded successfully')
        
        loadSavedAvatar()
      } else {
        throw new Error('Некорректный формат ответа сервера')
      }
    } catch (error) {
      console.error('User data loading error:', error)
      setProfile({
        status: 'error',
        message: error instanceof Error ? error.message : 'Не удалось загрузить данные',
      })
      loadSavedAvatar()
    }
  }, [loadSavedAvatar])

  const loadSettings = useCallback(() => {
    try {
      const saved = localStorage.getItem('user_settings')
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }, [])

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

  return {
    profile,
    avatar,
    settings,
    loadUserData,
    loadSettings,
    updateSettings,
    updateSoundSettings
  }
}