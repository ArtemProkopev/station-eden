'use client'
import { api } from '@/src/lib/api'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import styles from './page.module.css'

function LoginInner() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const router = useRouter()
	const sp = useSearchParams()
	const next = sp.get('next') || '/profile'

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)
		try {
			await api.login(email, password)
			router.replace(next)
		} catch (err: any) {
			setError(err.message || 'Ошибка входа')
		}
	}

	const tgEnabled = process.env.NEXT_PUBLIC_ENABLE_TELEGRAM === 'true'

	return (
		<div className={styles.container}>
			<div className={styles.card}>
				<form onSubmit={onSubmit} className={styles.form}>
					<div className={styles.inputGroup}>
						<label htmlFor="email" className={styles.label}>Email</label>
						<input
							id="email"
							required
							type='email'
							placeholder='Введите свой email'
							value={email}
							onChange={e => setEmail(e.target.value)}
							className={styles.input}
						/>
					</div>
					<div className={styles.inputGroup}>
						<label htmlFor="password" className={styles.label}>Пароль</label>
						<input
							id="password"
							required
							type='password'
							placeholder='Введите свой пароль'
							value={password}
							onChange={e => setPassword(e.target.value)}
							className={styles.input}
						/>
					</div>
					<button type='submit' className={styles.button}>
						ВОЙТИ
					</button>
				</form>
				{error && <p className={styles.error}>{error}</p>}
				<p className={styles.signupText}>
					Нет аккаунта? <a href='/register' className={styles.signupLink}>Зарегистрироваться</a>
				</p>

				{tgEnabled && (
					<>
						<hr className={styles.divider} />
						<p className={styles.telegramText}>Или войти через Telegram</p>
					</>
				)}
			</div>
		</div>
	)
}

export default function LoginPage() {
	return (
		<Suspense
			fallback={
				<div className={styles.container}>
					<div className={styles.card}>
						<p>Loading…</p>
					</div>
				</div>
			}
		>
			<LoginInner />
		</Suspense>
	)
}
