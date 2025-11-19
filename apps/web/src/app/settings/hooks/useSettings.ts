// apps/web/src/app/settings/hooks/useSettings.ts
'use client'

import { asset } from '@/lib/asset'
// Импортируем правильные типы из shared
import { SoundSettings, UserSettings } from '@station-eden/shared'
// Импортируем локальный UI-тип для профиля
import { ProfileState } from '../../profile/types'

import { useCallback, useState } from 'react'
import { PROFILE_CONFIG } from '../../profile/config'

// Используем UserSettings вместо SettingsType
const DEFAULT_SETTINGS: UserSettings = {
	sound: {
		masterVolume: 63,
		musicVolume: 63,
		effectsVolume: 63,
		outputDevice: 'headphones',
		muteWhenMinimized: true,
	},
	language: 'russian',
	sessionHistory: true,
	purchaseHistory: true,
}

const migrateToAbsoluteUrl = (url: string | null): string | undefined => {
	if (!url) return undefined
	return url.startsWith('http') ? url : asset(url)
}

export function useSettings() {
	const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
	// Используем ProfileState (бывший ProfileData)
	const [profile, setProfile] = useState<ProfileState>({ status: 'loading' })
	const [avatar, setAvatar] = useState<string>('/icons/avatar-placeholder.svg')

	const loadSavedAvatar = useCallback(() => {
		try {
			const savedAvatar = localStorage.getItem(
				PROFILE_CONFIG.STORAGE_KEYS.AVATAR
			)
			const userAvatar = localStorage.getItem('user_avatar')

			let finalAvatar =
				migrateToAbsoluteUrl(savedAvatar) ||
				migrateToAbsoluteUrl(userAvatar) ||
				asset(PROFILE_CONFIG.DEFAULT.AVATAR)
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

	const loadUserData = useCallback(async () => {
		try {
			const API_BASE =
				process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

			const response = await fetch(`${API_BASE}/auth/me`, {
				credentials: 'include',
				cache: 'no-store',
			})

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

			const payload = data?.data ?? data
			// Тут мы мапим ответ API на наш UI стейт
			// payload должен соответствовать типу User из shared
			const { id, email, username, avatar, frame } = payload

			if (typeof id === 'string' && typeof email === 'string') {
				setProfile({
					status: 'ok',
					data: { id, email, username, avatar, frame }, // Данные кладем в data
				})

				loadSavedAvatar()
			} else {
				throw new Error('Некорректный формат ответа сервера')
			}
		} catch (error) {
			console.error('User data loading error:', error)
			setProfile({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: 'Не удалось загрузить данные',
			})
			loadSavedAvatar()
		}
	}, [loadSavedAvatar])

	const loadSettings = useCallback(() => {
		try {
			const saved = localStorage.getItem('user_settings')
			if (saved) {
				const parsedSettings = JSON.parse(saved)
				setSettings({
					...DEFAULT_SETTINGS,
					...parsedSettings,
					sound: {
						...DEFAULT_SETTINGS.sound,
						...parsedSettings.sound,
					},
				})
			}
		} catch (error) {
			console.error('Failed to load settings:', error)
		}
	}, [])

	const saveSettings = useCallback((newSettings: UserSettings) => {
		try {
			localStorage.setItem('user_settings', JSON.stringify(newSettings))
		} catch (error) {
			console.error('Failed to save settings:', error)
		}
	}, [])

	const updateSettings = useCallback(
		(updates: Partial<UserSettings>) => {
			setSettings(prev => {
				// prev выводится автоматически как UserSettings
				const newSettings = { ...prev, ...updates }
				saveSettings(newSettings)
				return newSettings
			})
		},
		[saveSettings]
	)

	const updateSoundSettings = useCallback(
		(updates: Partial<SoundSettings>) => {
			setSettings(prev => {
				const newSoundSettings = { ...prev.sound, ...updates }
				const newSettings = { ...prev, sound: newSoundSettings }
				saveSettings(newSettings)
				return newSettings
			})
		},
		[saveSettings]
	)

	return {
		profile,
		avatar,
		settings,
		loadUserData,
		loadSettings,
		updateSettings,
		updateSoundSettings,
	}
}
