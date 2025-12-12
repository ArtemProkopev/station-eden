export const PROFILE_CONFIG = {
	STORAGE_KEYS: {
		AVATAR: 'profile_avatar',
		FRAME: 'profile_frame',
	} as const,

	DEFAULT: {
		AVATAR: '/avatars/avatar1.png',
		FRAME: '/frames/frame1.png',
	} as const,

	ASSETS: {
		ICONS: {
			planet: '/icons/planet.svg',
			polygon: '/icons/polygon.svg',
			copy: '/icons/copy.svg',
		},
		DECOR: {
			leaves: '/decor/leaves.png',
		},
	} as const,

	ANIMATION: {
		NEON_PULSE: '3s ease-in-out infinite alternate',
	} as const,
} as const

export const BREAKPOINTS = {
	MOBILE: 768,
	SMALL_MOBILE: 480,
} as const

// пер-юзер ключи (чтобы аккаунты не перетирали друг друга в одном браузере)
export const avatarKey = (userId: string) =>
	`${PROFILE_CONFIG.STORAGE_KEYS.AVATAR}:${userId}`

export const frameKey = (userId: string) =>
	`${PROFILE_CONFIG.STORAGE_KEYS.FRAME}:${userId}`
