// apps/web/src/hooks/useUserData.ts
'use client'

import { useEffect, useState } from 'react'

export interface UserData {
	avatar?: string
	username?: string
	email?: string
	userId?: string
	status: 'loading' | 'ok' | 'error'
}

// Фолбек-аватар и имя гостя — гарантированно существующие
const GUEST_AVATAR = '/avatars/avatar1.png'
const GUEST_USERNAME = 'Гость'

export function useUserData(): UserData {
	const [userData, setUserData] = useState<UserData>({
		avatar: undefined,
		username: undefined,
		email: undefined,
		userId: undefined,
		status: 'loading',
	})

	useEffect(() => {
		const loadUserData = () => {
			try {
				const savedAvatar = localStorage.getItem('user_avatar') || ''
				const savedUsername = localStorage.getItem('username') || ''
				const savedEmail = localStorage.getItem('user_email') || ''
				const savedUserId = localStorage.getItem('user_id') || ''

				const avatar = savedAvatar || GUEST_AVATAR
				const username = savedUsername || GUEST_USERNAME

				// Никаких автозаписей моков в localStorage
				setUserData({
					avatar,
					username,
					email: savedEmail || undefined,
					userId: savedUserId || undefined,
					status: 'ok',
				})
			} catch (error) {
				console.error('Error loading user data:', error)
				setUserData({
					avatar: GUEST_AVATAR,
					username: GUEST_USERNAME,
					status: 'error',
				})
			}
		}

		const timer = setTimeout(loadUserData, 300)
		return () => clearTimeout(timer)
	}, [])

	return userData
}
