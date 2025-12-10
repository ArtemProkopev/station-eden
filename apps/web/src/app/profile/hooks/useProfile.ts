// apps/web/src/app/profile/hooks/useProfile.ts
import { asset } from '@/lib/asset'
import { useCallback, useState } from 'react'
import { PROFILE_CONFIG } from '../config'
import { ProfileIconsStatus, ProfileState } from '../types'

type ProfileAssets = {
	avatar: string
	frame: string
}

const migrateToAbsoluteUrl = (url: string | null): string | undefined => {
	if (!url) return undefined
	return url.startsWith('http') ? url : asset(url)
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export const useProfile = () => {
	const [profile, setProfile] = useState<ProfileState>({ status: 'loading' })

	const [assets, setAssets] = useState<ProfileAssets>({
		avatar: asset(PROFILE_CONFIG.DEFAULT.AVATAR),
		frame: asset(PROFILE_CONFIG.DEFAULT.FRAME),
	})

	const [iconsStatus, setIconsStatus] = useState<ProfileIconsStatus>({
		planet: true,
		polygon: true,
		copy: true,
	})

	const [isEditModalOpen, setIsEditModalOpen] = useState(false)

	// модалка смены ника
	const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false)

	const openUsernameModal = useCallback(() => {
		setIsUsernameModalOpen(true)
	}, [])

	const closeUsernameModal = useCallback(() => {
		setIsUsernameModalOpen(false)
	}, [])

	const loadSavedAssets = useCallback(() => {
		try {
			const savedAvatar = localStorage.getItem(
				PROFILE_CONFIG.STORAGE_KEYS.AVATAR
			)
			const savedFrame = localStorage.getItem(PROFILE_CONFIG.STORAGE_KEYS.FRAME)

			const migratedAvatar = migrateToAbsoluteUrl(savedAvatar)
			const migratedFrame = migrateToAbsoluteUrl(savedFrame)

			if (migratedAvatar) {
				setAssets(prev => ({ ...prev, avatar: migratedAvatar }))
				localStorage.setItem(PROFILE_CONFIG.STORAGE_KEYS.AVATAR, migratedAvatar)
			}

			if (migratedFrame) {
				setAssets(prev => ({ ...prev, frame: migratedFrame }))
				localStorage.setItem(PROFILE_CONFIG.STORAGE_KEYS.FRAME, migratedFrame)
			}
		} catch (e) {
			console.error('Error accessing localStorage', e)
		}
	}, [])

	const checkIconsAvailability = useCallback(async () => {
		const statusUpdates: Partial<ProfileIconsStatus> = {}
		const toCheck = PROFILE_CONFIG.ASSETS.ICONS

		await Promise.allSettled(
			Object.entries(toCheck).map(async ([key, path]) => {
				try {
					await fetch(asset(path), {
						method: 'GET',
						cache: 'no-store',
						mode: 'no-cors',
					})
					statusUpdates[key as keyof ProfileIconsStatus] = true
				} catch {
					statusUpdates[key as keyof ProfileIconsStatus] = false
				}
			})
		)
		setIconsStatus((prev: ProfileIconsStatus) => ({
			...prev,
			...statusUpdates,
		}))
	}, [])

	const loadUserData = useCallback(async () => {
		try {
			const response = await fetch(`${API_BASE}/auth/me`, {
				credentials: 'include',
				cache: 'no-store',
			})

			if (response.status === 401) {
				setProfile({
					status: 'unauth',
					message:
						'Вы не авторизованы. Войдите в аккаунт, чтобы открыть профиль.',
				})
				return
			}

			if (!response.ok) throw new Error(`HTTP ${response.status}`)

			const data = await response.json()
			const payload = data?.data ?? data

			const { userId, email, username = null, avatar, frame } = payload

			if (typeof userId === 'string' && typeof email === 'string') {
				setProfile({
					status: 'ok',
					data: {
						id: userId,
						email,
						username: username || '',
						avatar,
						frame,
					},
				})
			} else {
				throw new Error('Некорректный формат ответа сервера')
			}
		} catch (error) {
			console.error('Profile data loading error:', error)
			setProfile({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: 'Не удалось загрузить профиль',
			})
		}
	}, [])

	const handleSaveProfile = useCallback(
		(newAvatar: string, newFrame: string) => {
			setAssets({ avatar: newAvatar, frame: newFrame })
			localStorage.setItem(PROFILE_CONFIG.STORAGE_KEYS.AVATAR, newAvatar)
			localStorage.setItem(PROFILE_CONFIG.STORAGE_KEYS.FRAME, newFrame)
		},
		[]
	)

	/**
	 * Обновление никнейма на сервере и в локальном состоянии профиля
	 * Вариант A: используем PUT /users/profile
	 */
	const updateUsername = useCallback(async (newUsername: string) => {
		const value = newUsername.trim()
		if (!value) {
			throw new Error('Введите никнейм')
		}

		const res = await fetch(`${API_BASE}/users/profile`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			credentials: 'include',
			body: JSON.stringify({ username: value }),
		})

		if (!res.ok) {
			let msg = 'Не удалось сохранить никнейм. Попробуйте ещё раз позже.'
			try {
				const data = await res.json()
				const serverMessage = (data as any)?.message
				if (serverMessage) {
					msg = Array.isArray(serverMessage)
						? serverMessage.join(', ')
						: serverMessage
				}
			} catch {
				// ignore parse error, оставляем дефолтный текст
			}
			throw new Error(msg)
		}

		// ответ контроллера updateProfile:
		// { ok: true, avatar, frame, username, usernameChangedAt }
		const data = await res.json()
		const usernameFromServer =
			(data as any)?.username ?? (data as any)?.data?.username ?? value

		setProfile(prev => {
			if (prev.status !== 'ok' || !prev.data) return prev
			return {
				...prev,
				data: {
					...prev.data,
					username: usernameFromServer,
				},
			}
		})
	}, [])

	/**
	 * Обработчик ошибок иконок.
	 * Тип параметра — string, чтобы совпадал с пропсом ProfileHeader.
	 */
	const handleIconError = useCallback((iconName: string) => {
		setIconsStatus((prev: ProfileIconsStatus) => {
			if (!(iconName in prev)) return prev
			const key = iconName as keyof ProfileIconsStatus
			return {
				...prev,
				[key]: false,
			}
		})
	}, [])

	return {
		profile,
		assets,
		iconsStatus,
		isEditModalOpen,
		isUsernameModalOpen,
		loadSavedAssets,
		checkIconsAvailability,
		loadUserData,
		handleSaveProfile,
		setIconsStatus,
		setIsEditModalOpen,
		openUsernameModal,
		closeUsernameModal,
		updateUsername,
		handleIconError,
	}
}
