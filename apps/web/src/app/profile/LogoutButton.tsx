'use client'

import { api } from '@/src/lib/api'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './page.module.css'

export default function LogoutButton() {
	const [loading, setLoading] = useState(false)
	const router = useRouter()

	async function onLogout() {
		if (loading) return
		setLoading(true)
		try {
			await api.logout()
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new Event('session-changed'))
			}
			router.replace('/login')
		} catch {
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
			{loading ? 'покидаем станцию...' : 'покинуть станцию'}
		</button>
	)
}
