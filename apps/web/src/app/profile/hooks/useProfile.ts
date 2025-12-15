// apps/web/src/app/profile/hooks/useProfile.ts
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

function readCookie(name: string): string | null {
	if (typeof document === 'undefined') return null
	const m = document.cookie.match(
		new RegExp(
			`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`
		)
	)
	return m ? decodeURIComponent(m[1]) : null
}

async function ensureCsrf() {
	try {
		await fetch('/auth/csrf', {
			method: 'GET',
			credentials: 'include',
			cache: 'no-store',
		})
	} catch {
		// не критично
	}
}

function csrfHeader(): Record<string, string> {
	const token = readCookie('se_csrf')
	return token ? { 'x-csrf-token': token } : {}
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
			Object.entries(toCheck).map(async ([key, path]) => {
				try {
					const url = asset(path)
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
	 * Грузим профиль строго same-origin:
	 * /auth/me (Caddy proxy → api:4000)
	 *
	 * ВАЖНО: формат ответа “разный” — поэтому аккуратно распаковываем.
	 */
	const loadUserData = useCallback(async () => {
		try {
			const meResp = await fetch('/auth/me', {
				method: 'GET',
				credentials: 'include',
				cache: 'no-store',
			})

			if (meResp.status === 401) {
				setProfile({
					status: 'unauth',
					message:
						'Вы не авторизованы. Войдите в аккаунт, чтобы открыть профиль.',
				})
				return
			}

			if (!meResp.ok) {
				throw new Error(
					`Не удалось загрузить профиль (/auth/me): ${meResp.status}`
				)
			}

			const raw = (await meResp.json().catch(() => null)) as MePayloadLike
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
			setProfile({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: 'Не удалось загрузить профиль',
			})
		}
	}, [loadSavedAssets])

	const handleSaveProfile = useCallback(
		async (newAvatar: string, newFrame: string) => {
			if (profile.status !== 'ok' || !profile.data?.id) {
				throw new Error('Нет авторизованного пользователя')
			}

			await ensureCsrf()

			const resp = await fetch('/api/users/profile', {
				method: 'PUT',
				credentials: 'include',
				cache: 'no-store',
				headers: {
					'Content-Type': 'application/json',
					...csrfHeader(),
				},
				body: JSON.stringify({
					avatar: newAvatar,
					frame: newFrame,
				}),
			})

			if (resp.status === 401) {
				setProfile({
					status: 'unauth',
					message: 'Сессия истекла. Войдите заново.',
				})
				throw new Error('Unauthorized')
			}

			if (!resp.ok) {
				const txt = await resp.text().catch(() => '')
				throw new Error(`Ошибка сохранения профиля: ${resp.status} ${txt}`)
			}

			const raw = (await resp.json().catch(() => ({}))) as any
			const data = unwrapAny<any>(raw)

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

			const uid = profile.data.id
			localStorage.setItem(avatarKey(uid), avatarAbs)
			localStorage.setItem(frameKey(uid), frameAbs)
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

			await ensureCsrf()

			const resp = await fetch('/api/users/profile', {
				method: 'PUT',
				credentials: 'include',
				cache: 'no-store',
				headers: {
					'Content-Type': 'application/json',
					...csrfHeader(),
				},
				body: JSON.stringify({ username: value }),
			})

			if (resp.status === 401) {
				setProfile({
					status: 'unauth',
					message: 'Сессия истекла. Войдите заново.',
				})
				throw new Error('Unauthorized')
			}

			if (!resp.ok) {
				const txt = await resp.text().catch(() => '')
				throw new Error(`Ошибка обновления никнейма: ${resp.status} ${txt}`)
			}

			const raw = (await resp.json().catch(() => ({}))) as any
			const data = unwrapAny<any>(raw)
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
