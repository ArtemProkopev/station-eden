// apps/web/src/app/profile/hooks/useProfile.ts
import { api } from '@/lib/api'
import { asset } from '@/lib/asset'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PROFILE_CONFIG, avatarKey, frameKey } from '../config'
import { ProfileIconsStatus, ProfileState } from '../types'

type ProfileAssets = {
	avatar: string
	frame: string
}

const migrateToAbsoluteUrl = (
	url: string | null | undefined
): string | undefined => {
	if (!url) return undefined
	return url.startsWith('http') ? url : asset(url)
}

type MePayloadLike = any

function unwrapAny<T = any>(v: any): T {
	// возможные обёртки
	// - {data: {...}}
	// - {user: {...}}
	// - {status:'signed-in', user:{...}}
	if (!v || typeof v !== 'object') return v as T
	if ('data' in v && v.data && typeof v.data === 'object') return v.data as T
	if ('status' in v && v.status === 'signed-in' && v.user) return v.user as T
	if ('user' in v && v.user && typeof v.user === 'object') return v.user as T
	return v as T
}

function pickString(v: any): string | null {
	return typeof v === 'string' && v.trim() ? v : null
}

function isApiErrorLike(e: any): e is { status?: number; userMessage?: string } {
	return !!e && typeof e === 'object' && ('status' in e || 'userMessage' in e)
}

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
	const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false)

	// ✅ держим актуальный profile в ref, чтобы колбэки не зависели от profile в deps
	const profileRef = useRef(profile)
	useEffect(() => {
		profileRef.current = profile
	}, [profile])

	const openUsernameModal = useCallback(() => setIsUsernameModalOpen(true), [])
	const closeUsernameModal = useCallback(
		() => setIsUsernameModalOpen(false),
		[]
	)

	/**
	 * ✅ Кэш по userId — только fallback.
	 * ВАЖНО: этот колбэк должен быть стабильным и НЕ зависеть от profile,
	 * иначе будет бесконечный цикл в местах где useEffect([loadUserData]).
	 */
	const loadSavedAssets = useCallback((userId?: string) => {
		try {
			const currentProfile = profileRef.current
			const uid =
				userId ||
				(currentProfile.status === 'ok' ? currentProfile.data?.id : undefined)

			if (!uid) return

			const savedAvatar = localStorage.getItem(avatarKey(uid))
			const savedFrame = localStorage.getItem(frameKey(uid))

			const migratedAvatar = migrateToAbsoluteUrl(savedAvatar ?? undefined)
			const migratedFrame = migrateToAbsoluteUrl(savedFrame ?? undefined)

			if (migratedAvatar) {
				setAssets(prev => ({ ...prev, avatar: migratedAvatar }))
				localStorage.setItem(avatarKey(uid), migratedAvatar)
			}
			if (migratedFrame) {
				setAssets(prev => ({ ...prev, frame: migratedFrame }))
				localStorage.setItem(frameKey(uid), migratedFrame)
			}
		} catch (e) {
			console.error('Error accessing localStorage', e)
		}
	}, [])

	const checkIconsAvailability = useCallback(async () => {
		const statusUpdates: Partial<ProfileIconsStatus> = {}
		const toCheck = PROFILE_CONFIG.ASSETS.ICONS

		await Promise.allSettled(
			Object.entries(toCheck).map(async ([key, p]) => {
				try {
					const url = asset(p)
					const resp = await fetch(url, { method: 'HEAD', cache: 'no-store' })
					statusUpdates[key as keyof ProfileIconsStatus] = resp.ok
				} catch {
					statusUpdates[key as keyof ProfileIconsStatus] = false
				}
			})
		)

		setIconsStatus(prev => ({ ...prev, ...statusUpdates }))
	}, [])

	/**
	 * ✅ Грузим профиль через единый API-клиент (NEXT_PUBLIC_API_BASE).
	 * Больше никакого fetch('/auth/me') → 404 от Next в dev исчезает.
	 */
	const loadUserData = useCallback(async () => {
		try {
			const raw = (await api.me().catch(e => {
				// api.me() кидает ApiError; обработаем 401 красиво
				if (isApiErrorLike(e) && e.status === 401) {
					setProfile({
						status: 'unauth',
						message:
							'Вы не авторизованы. Войдите в аккаунт, чтобы открыть профиль.',
					})
					return null
				}
				throw e
			})) as MePayloadLike | null

			if (!raw) return

			const payload = unwrapAny<any>(raw)

			// поддерживаем userId или id
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
				console.error('[profile] /auth/me raw=', raw)
				throw new Error('Некорректный формат ответа /auth/me')
			}

			const avatarAbs = migrateToAbsoluteUrl(avatarRaw) ?? null
			const frameAbs = migrateToAbsoluteUrl(frameRaw) ?? null

			setProfile({
				status: 'ok',
				data: {
					id: userId,
					email,
					username: username ?? '',
					avatar: avatarAbs ?? undefined,
					frame: frameAbs ?? undefined,
				},
			})

			// Сервер — источник истины.
			// Но если в БД null — используем кэш.
			if (avatarAbs) {
				setAssets(prev => ({ ...prev, avatar: avatarAbs }))
				localStorage.setItem(avatarKey(userId), avatarAbs)
			} else {
				const cached = localStorage.getItem(avatarKey(userId))
				if (cached) setAssets(prev => ({ ...prev, avatar: cached }))
			}

			if (frameAbs) {
				setAssets(prev => ({ ...prev, frame: frameAbs }))
				localStorage.setItem(frameKey(userId), frameAbs)
			} else {
				const cached = localStorage.getItem(frameKey(userId))
				if (cached) setAssets(prev => ({ ...prev, frame: cached }))
			}

			// подтягиваем кэш “на всякий”
			loadSavedAssets(userId)
		} catch (error: any) {
			console.error('Profile data loading error:', error)

			// Если это ApiError — покажем userMessage
			if (isApiErrorLike(error)) {
				setProfile({
					status: 'error',
					message:
						typeof error.userMessage === 'string' && error.userMessage
							? error.userMessage
							: 'Не удалось загрузить профиль',
				})
				return
			}

			setProfile({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: 'Не удалось загрузить профиль',
			})
		}
	}, [loadSavedAssets])

	/**
	 * ✅ Сохранение профиля через единый API-клиент.
	 * Никаких ensureCsrf()/fetch('/auth/csrf') тут больше не нужно —
	 * api.updateProfile сам делает CSRF и правильные заголовки.
	 */
	const handleSaveProfile = useCallback(
		async (newAvatar: string, newFrame: string) => {
			if (profile.status !== 'ok' || !profile.data?.id) {
				throw new Error('Нет авторизованного пользователя')
			}

			try {
				const data = await api.updateProfile({
					avatar: newAvatar,
					frame: newFrame,
				})

				const uid = profile.data.id

				const avatarAbs =
					migrateToAbsoluteUrl(data?.avatar) ??
					migrateToAbsoluteUrl(newAvatar) ??
					newAvatar

				const frameAbs =
					migrateToAbsoluteUrl(data?.frame) ??
					migrateToAbsoluteUrl(newFrame) ??
					newFrame

				setAssets({ avatar: avatarAbs, frame: frameAbs })

				setProfile(prev => {
					if (prev.status !== 'ok' || !prev.data) return prev
					return {
						...prev,
						data: {
							...prev.data,
							avatar: avatarAbs,
							frame: frameAbs,
						},
					}
				})

				localStorage.setItem(avatarKey(uid), avatarAbs)
				localStorage.setItem(frameKey(uid), frameAbs)
			} catch (e: any) {
				if (isApiErrorLike(e) && e.status === 401) {
					setProfile({
						status: 'unauth',
						message: 'Сессия истекла. Войдите заново.',
					})
					throw new Error('Unauthorized')
				}
				throw e
			}
		},
		[profile]
	)

	const updateUsername = useCallback(
		async (newUsername: string) => {
			if (profile.status !== 'ok' || !profile.data?.id) {
				throw new Error('Нет авторизованного пользователя')
			}

			const value = newUsername.trim()
			if (!value) throw new Error('Введите никнейм')

			try {
				const data = await api.updateProfile({ username: value })

				const usernameFromServer =
					(typeof data?.username === 'string' && data.username) || value

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
			} catch (e: any) {
				if (isApiErrorLike(e) && e.status === 401) {
					setProfile({
						status: 'unauth',
						message: 'Сессия истекла. Войдите заново.',
					})
					throw new Error('Unauthorized')
				}
				throw e
			}
		},
		[profile]
	)

	const handleIconError = useCallback((iconName: string) => {
		setIconsStatus(prev => {
			if (!(iconName in prev)) return prev
			const key = iconName as keyof ProfileIconsStatus
			return { ...prev, [key]: false }
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
