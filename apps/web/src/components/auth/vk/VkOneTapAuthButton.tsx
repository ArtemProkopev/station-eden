'use client'

import { API_BASE } from '@/lib/flags'
import { useMemo } from 'react'
import styles from './VkOneTapAuthButton.module.css'

type Props = {
	mode: 'login' | 'register'
	next: string
}

function sanitizeNext(raw: unknown): string {
	const s = String(raw || '').trim()
	if (!s) return '/profile'
	if (!s.startsWith('/')) return '/profile'
	if (s.startsWith('//')) return '/profile'
	return s
}

export default function VkOneTapAuthButton({ mode, next }: Props) {
	const href = useMemo(() => {
		const nextParam = sanitizeNext(next)
		const query = new URLSearchParams({
			mode,
			next: nextParam,
		})

		return `${API_BASE}/auth/vk?${query.toString()}`
	}, [mode, next])

	return (
		<a className={styles.button} href={href} rel='nofollow'>
			<span className={styles.iconBox} aria-hidden='true'>
				<svg
					className={styles.icon}
					width='20'
					height='20'
					viewBox='0 0 20 20'
					fill='none'
					xmlns='http://www.w3.org/2000/svg'
					focusable='false'
				>
					<path
						fill='currentColor'
						fillRule='evenodd'
						clipRule='evenodd'
						d='M1.406 1.406C0 2.812 0 5.075 0 9.6v.8c0 4.526 0 6.788 1.406 8.194S5.075 20 9.6 20h.8c4.526 0 6.788 0 8.194-1.406S20 14.925 20 10.4v-.8c0-4.525 0-6.788-1.406-8.194S14.925 0 10.4 0h-.8C5.075 0 2.812 0 1.406 1.406M3.38 6c.107 5.203 2.845 8.33 7.358 8.33h.261v-2.97c1.644.167 2.87 1.387 3.37 2.97h2.37c-.644-2.369-2.31-3.68-3.346-4.18 1.035-.619 2.5-2.114 2.845-4.15h-2.156c-.452 1.655-1.798 3.158-3.084 3.3V6h-2.19v5.77C7.475 11.437 5.737 9.822 5.665 6z'
					/>
				</svg>
			</span>

			<span className={styles.text}>
				{mode === 'login' ? 'Войти с VK ID' : 'Продолжить с VK ID'}
			</span>
		</a>
	)
}
