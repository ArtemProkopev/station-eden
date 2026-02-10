// apps/web/src/components/auth/YandexAuthButton.tsx
'use client'

import { API_BASE } from '@/src/lib/flags'
import { useMemo } from 'react'
import styles from './YandexAuthButton.module.css'

type Props = {
	label?: string
	mode?: 'login' | 'register'
	size?: 's' | 'm' | 'l' // по гайду: 36/44/56
	fullWidth?: boolean
	next?: string // опционально: можно передать заранее вычисленный next
}

function sanitizeNext(raw: unknown): string {
	const s = String(raw || '').trim()
	if (!s) return '/profile'
	if (!s.startsWith('/')) return '/profile'
	if (s.startsWith('//')) return '/profile'
	return s
}

export default function YandexAuthButton({
	label = 'Войти с Яндекс ID',
	mode = 'login',
	size = 'm',
	fullWidth = true,
	next,
}: Props) {
	const nextParam = useMemo(() => {
		if (next) return sanitizeNext(next)
		if (typeof window === 'undefined') return '/profile'
		const fromQuery =
			new URLSearchParams(window.location.search).get('next') || '/profile'
		return sanitizeNext(fromQuery)
	}, [next])

	const href = useMemo(() => {
		return `${API_BASE}/auth/yandex?mode=${mode}&next=${encodeURIComponent(
			nextParam,
		)}`
	}, [mode, nextParam])

	return (
		<div
			className={`${styles.wrap} ${fullWidth ? styles.fullWidth : ''}`}
			data-size={size}
		>
			<a
				className={styles.button}
				href={href}
				rel='nofollow'
				aria-label={label}
			>
				<span className={styles.icon} aria-hidden='true'>
					<span className={styles.iconBg} />
					<span className={styles.iconY}>Я</span>
				</span>

				<span className={styles.text}>{label}</span>
			</a>
		</div>
	)
}
