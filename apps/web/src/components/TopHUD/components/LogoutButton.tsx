// apps/web/src/components/TopHUD/components/LogoutButton.tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import styles from './UserDropdown.module.css'

export default function LogoutButton() {
	const [loading, setLoading] = useState(false)
	const router = useRouter()
	const pathname = usePathname()

	const handleLogout = useCallback(async () => {
		if (loading) return
		setLoading(true)

		const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
		const url = `${API_BASE}/auth/logout-get`

		try {
			// Дожидаемся, пока сервер очистит httpOnly-куки
			await fetch(url, {
				method: 'GET',
				credentials: 'include',
			})
		} catch (err) {
			console.warn('[logout] request failed:', err)
			// даже если запрос упал — всё равно почистим клиентское состояние
		}

		// Обновляем клиентское состояние сессии
		try {
			window.dispatchEvent(new Event('session-changed'))
		} catch {}

		// Чистим локальные данные пользователя
		try {
			localStorage.removeItem('user_avatar')
			localStorage.removeItem('username')
			localStorage.removeItem('user_email')
			localStorage.removeItem('user_id')
		} catch {}

		// Если мы НЕ на главной — уходим на /
		// На главной остаёмся, HomePage сам уберёт HUD по session-changed
		if (pathname !== '/') {
			router.push('/')
		}

		setLoading(false)
	}, [loading, pathname, router])

	return (
		<button
			className={styles.menuItem}
			onClick={handleLogout}
			disabled={loading}
			aria-label='Выйти из аккаунта'
		>
			{loading ? 'Покидаем станцию...' : 'Покинуть станцию'}
		</button>
	)
}
