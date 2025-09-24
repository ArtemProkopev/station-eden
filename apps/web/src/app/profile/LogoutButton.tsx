'use client'

import { api } from '@/src/lib/api'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './page.module.css'

/** Лёгкая “ссылка”-кнопка: вид — как у подписи “Входит как” */
export default function LogoutButton() {
	const [loading, setLoading] = useState(false)
	const router = useRouter()

	async function onLogout() {
		if (loading) return
		setLoading(true)
		try {
			// ВАЖНО: используем общий клиент, там корректный CSRF (se_csrf) и /auth/csrf
			await api.logout()

			// Подскажем навбару обновиться
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new Event('session-changed'))
			}

			// Жёсткий переход на страницу логина
			router.replace('/login')
		} catch (e) {
			// В редких случаях можно попытаться “сбросить” вид навбара
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new Event('session-changed'))
			}
			router.replace('/login')
		} finally {
			setLoading(false)
		}
	}

	return (
		<button
			type='button'
			className={styles.exitLink}
			onClick={onLogout}
			disabled={loading}
			aria-label='Выйти из профиля'
		>
			{loading ? 'Выход…' : 'Выйти'}
		</button>
	)
}
