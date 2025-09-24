'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './page.module.css'

function getCsrf() {
	return (
		document.cookie
			.split('; ')
			.find(c => c.startsWith('csrf_token='))
			?.split('=')[1] ?? ''
	)
}

/** Лёгкая “ссылка”-кнопка: вид — как у подписи “Входит как” */
export default function LogoutButton() {
	const [loading, setLoading] = useState(false)
	const router = useRouter()

	async function onLogout() {
		if (loading) return
		setLoading(true)
		try {
			const csrf = getCsrf()
			await fetch(
				(process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000') +
					'/auth/logout',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-csrf-token': csrf,
					},
					credentials: 'include',
					body: '{}',
					cache: 'no-store',
				}
			)
			window.dispatchEvent(new Event('session-changed'))
		} catch {}
		router.replace('/login')
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
