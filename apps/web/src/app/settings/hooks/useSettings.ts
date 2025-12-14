// apps/web/src/app/settings/hooks/useSettings.ts
'use client'

import { asset } from '@/lib/asset'
import { SoundSettings, UserSettings } from '@station-eden/shared'
import { useCallback, useState } from 'react'
import { PROFILE_CONFIG, avatarKey } from '../../profile/config'
import { ProfileState } from '../../profile/types'

const API_BASE =
	process.env.NEXT_PUBLIC_API_BASE?.trim() || 'http://localhost:4000'

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

const migrateToAbsoluteUrl = (
	url: string | null | undefined
): string | undefined => {
	if (!url) return undefined
	return url.startsWith('http') ? url : asset(url)
}

type MePayloadLike = any

function unwrapAny<T = any>(v: any): T {
	if (!v || typeof v !== 'object') return v as T
	if ('data' in v && v.data && typeof v.data === 'object') return v.data as T
	if ('status' in v && v.status === 'signed-in' && v.user) return v.user as T
	if ('user' in v && v.user && typeof v.user === 'object') return v.user as T
	return v as T
}

function pickString(v: any): string | null {
	return typeof v === 'string' && v.trim() ? v : null
}

export function useSettings() {
	const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
	const [profile, setProfile] = useState<ProfileState>({ status: 'loading' })
	const [avatar, setAvatar] = useState<string>(
		asset(PROFILE_CONFIG.DEFAULT.AVATAR)
	)

	const loadSavedAvatar = useCallback((userId?: string) => {
		try {
			const uid = pickString(userId) || null

			const legacyAvatar = localStorage.getItem(
				PROFILE_CONFIG.STORAGE_KEYS.AVATAR
			)
			const legacyUserAvatar = localStorage.getItem('user_avatar')

			const perUserAvatar = uid ? localStorage.getItem(avatarKey(uid)) : null

			const finalAvatar =
				migrateToAbsoluteUrl(perUserAvatar) ||
				migrateToAbsoluteUrl(legacyAvatar) ||
				migrateToAbsoluteUrl(legacyUserAvatar) ||
				asset(PROFILE_CONFIG.DEFAULT.AVATAR)

			setAvatar(finalAvatar)

			fetch(finalAvatar, { method: 'HEAD', cache: 'no-store' })
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
			const response = await fetch(`${API_BASE}/auth/me`, {
				method: 'GET',
				credentials: 'include',
				cache: 'no-store',
			})

			if (response.status === 401) {
				console.warn('Unauthorized')
				setProfile({
					status: 'unauth',
					message: 'Вы не авторизованы.',
				})
				loadSavedAvatar(undefined)
				return
			}

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`)
			}

			const raw = (await response.json().catch(() => null)) as MePayloadLike
			const payload = unwrapAny<any>(raw)

			const userId =
				pickString(payload?.userId) ||
				pickString(payload?.id) ||
				pickString(payload?.user?.userId) ||
				pickString(payload?.user?.id)

			const email =
				pickString(payload?.email) || pickString(payload?.user?.email) || null

			const username =
				typeof payload?.username === 'string'
					? payload.username
					: typeof payload?.user?.username === 'string'
						? payload.user.username
						: null

			const avatarRaw =
				typeof payload?.avatar === 'string'
					? payload.avatar
					: typeof payload?.user?.avatar === 'string'
						? payload.user.avatar
						: null

			const frameRaw =
				typeof payload?.frame === 'string'
					? payload.frame
					: typeof payload?.user?.frame === 'string'
						? payload.user.frame
						: null

			if (!userId || !email) {
				console.error('[settings] /auth/me raw=', raw)
				throw new Error('Некорректный формат ответа сервера')
			}

			const avatarAbs = migrateToAbsoluteUrl(avatarRaw) ?? null
			const frameAbs = migrateToAbsoluteUrl(frameRaw) ?? null

			setProfile({
				status: 'ok',
				data: {
					id: userId,
					email,
					username,
					avatar: avatarAbs,
					frame: frameAbs,
				} as any,
			})

			if (avatarAbs) {
				setAvatar(avatarAbs)
				localStorage.setItem(avatarKey(userId), avatarAbs)
			} else {
				loadSavedAvatar(userId)
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
			loadSavedAvatar(undefined)
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
