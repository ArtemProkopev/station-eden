// apps/web/src/app/settings/types.ts
export interface SoundSettingsType {
  masterVolume: number
  musicVolume: number
  effectsVolume: number
  outputDevice: string
  muteWhenMinimized: boolean
}

export interface SettingsType {
  sound: SoundSettingsType
  language: string
  sessionHistory: boolean
  purchaseHistory: boolean
}

export interface UserProfile {
  avatar: string
  username: string
  email?: string
  userId?: string
  status: 'loading' | 'ok' | 'error' | 'unauth'
}