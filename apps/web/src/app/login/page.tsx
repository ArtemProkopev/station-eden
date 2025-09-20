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
						<label htmlFor="email" className={styles.label}>Username</label>
						<input
							id="email"
							required
							type='email'
							placeholder='Enter your username'
							value={email}
							onChange={e => setEmail(e.target.value)}
							className={styles.input}
						/>
					</div>
					<div className={styles.inputGroup}>
						<label htmlFor="password" className={styles.label}>Password</label>
						<input
							id="password"
							required
							type='password'
							placeholder='Enter your password'
							value={password}
							onChange={e => setPassword(e.target.value)}
							className={styles.input}
						/>
					</div>
					<button type='submit' className={styles.button}>
						LOGIN
					</button>
				</form>
				{error && <p className={styles.error}>{error}</p>}
				<p className={styles.signupText}>
					Don't have an account? <a href='/register' className={styles.signupLink}>Sign Up</a>
				</p>

				{tgEnabled && (
					<>
						<hr className={styles.divider} />
						<p className={styles.telegramText}>Or login with Telegram</p>
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
