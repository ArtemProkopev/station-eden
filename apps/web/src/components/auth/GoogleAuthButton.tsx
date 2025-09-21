'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from './GoogleAuthButton.module.css'

type Props = {
	/** Текст на кнопке */
	label?: string
	/** Доп. классы обёртки (если нужно подогнать отступы) */
	className?: string
}

export default function GoogleAuthButton({
	label = 'Войти через Google',
	className,
}: Props) {
	const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
	const [busy, setBusy] = useState(false)
	const [blocked, setBlocked] = useState(false)

	// Мягкая детекция блокировщиков: пробуем загрузить GSI
	useEffect(() => {
		let done = false
		const s = document.createElement('script')
		s.src = 'https://accounts.google.com/gsi/client'
		s.async = true
		s.onload = () => {
			done = true
		}
		s.onerror = () => {
			done = true
			setBlocked(true)
		}
		document.head.appendChild(s)
		const t = setTimeout(() => {
			if (!done) setBlocked(true)
		}, 1800)
		return () => {
			clearTimeout(t)
			try {
				document.head.removeChild(s)
			} catch {}
		}
	}, [])

	const merged = useMemo(
		() =>
			[styles.button, busy ? styles.busy : '', className || '']
				.join(' ')
				.trim(),
		[busy, className]
	)

	async function start() {
		try {
			setBusy(true)
			// 1) Пытаемся получить готовый URL (ставит state-cookie):
			const r = await fetch(`${API}/auth/google/url`, {
				credentials: 'include',
			})
			if (r.ok) {
				const { url } = (await r.json()) as { url: string }
				window.location.href = url
				return
			}
			// 2) Фолбэк — прямой редирект
			window.location.href = `${API}/auth/google`
		} catch {
			window.location.href = `${API}/auth/google`
		} finally {
			// На случай, если навигация не случилась из-за ошибки:
			setTimeout(() => setBusy(false), 1200)
		}
	}

	return (
		<div className={styles.wrap}>
			<button
				type='button'
				onClick={start}
				className={merged}
				aria-label={label}
				aria-busy={busy}
				disabled={busy}
			>
				<GoogleG className={styles.icon} />
				<span className={styles.text}>{label}</span>
				{busy && <span className={styles.spinner} aria-hidden />}
			</button>

			{blocked && (
				<div className={styles.hint} role='status' aria-live='polite'>
					<strong>Подсказка.</strong> Похоже, privacy-расширение мешает входу
					через Google. Разрешите <code>accounts.google.com</code> и{' '}
					<code>gstatic.com</code> в uBlock/AdGuard/Privacy Badger и обновите
					страницу.
				</div>
			)}
		</div>
	)
}

/** Многоцветная “G” (SVG), без внешних ассетов */
function GoogleG({ className }: { className?: string }) {
	return (
		<svg viewBox='0 0 46 46' className={className} aria-hidden='true'>
			<g transform='scale(0.92) translate(2,2)'>
				<path
					fill='#EA4335'
					d='M23.49 20.5h20.02c.21 1.12.31 2.29.31 3.5 0 11.9-8 20.35-20.33 20.35C10.48 44.35 1 34.88 1 23.5S10.48 2.65 23.49 2.65c5.42 0 9.96 1.98 13.41 5.22l-5.7 5.7C29.31 11.54 26.7 10.5 23.49 10.5c-7 0-12.67 5.66-12.67 13s5.67 13 12.67 13c6.48 0 10.92-3.7 11.76-8.92H23.49V20.5z'
				/>
				<path
					fill='#FBBC05'
					d='M2.98 14.64l6.77 4.96C11.54 15.98 17.01 10.5 23.49 10.5c3.21 0 5.82 1.04 7.72 3.07l5.69-5.7C33.45 4.63 28.91 2.65 23.49 2.65 14.83 2.65 7.47 7.68 2.98 14.64z'
				/>
				<path
					fill='#34A853'
					d='M23.49 44.35c5.26 0 9.82-1.74 13.08-4.73l-6.04-4.95c-1.69 1.2-3.91 2.01-7.04 2.01-6.1 0-11.25-4.1-13.08-9.66l-6.88 5.29c3.53 7.05 10.7 12.04 20.96 12.04z'
				/>
				<path
					fill='#4285F4'
					d='M43.52 24c0-1.17-.1-2.34-.31-3.5H23.49v7.93h11.77c-.84 5.22-5.28 8.92-11.77 8.92-5.66 0-10.46-3.8-12.13-8.88l-6.77 4.96C7.07 38.79 14.43 44.35 23.49 44.35 35.82 44.35 43.52 35.9 43.52 24z'
				/>
			</g>
		</svg>
	)
}
