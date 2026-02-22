// apps/web/src/app/profile/config.ts
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

// Функции для генерации ключей localStorage с учётом userId
export const avatarKey = (userId: string) => `profile_avatar_${userId}`
export const frameKey = (userId: string) => `profile_frame_${userId}`
