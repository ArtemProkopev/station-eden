'use client'
import { api } from '@/src/lib/api'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import styles from './page.module.css'

/** Контурные иконки: прозрачная заливка, только stroke.
 *  Цвет — currentColor (берётся из .toggleBtn => var(--placeholder)).
 *  Толще линия для читабельности.
 */
function EyeIcon() {
	return (
		<svg
			viewBox='0 0 24 24'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2.5'
			strokeLinecap='round'
			strokeLinejoin='round'
		>
			<path d='M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z' />
			<circle cx='12' cy='12' r='3' />
		</svg>
	)
}
function EyeOffIcon() {
	return (
		<svg
			viewBox='0 0 24 24'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2.5'
			strokeLinecap='round'
			strokeLinejoin='round'
		>
			<path d='M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a21.8 21.8 0 0 1 4.22-4.92' />
			<path d='M9.88 9.88a3 3 0 1 0 4.24 4.24' />
			<path d='M10.58 4.1A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-3.12 3.91' />
			<line x1='1' y1='1' x2='23' y2='23' />
		</svg>
	)
}

function LoginInner() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [show, setShow] = useState(false)
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
				<h1 className={styles.title}>Вход</h1>

				<form onSubmit={onSubmit} className={styles.form}>
					<div className={styles.inputGroup}>
						<label htmlFor='email' className={styles.label}>
							Email
						</label>
						<input
							id='email'
							required
							type='email'
							autoComplete='email'
							placeholder='Введите свой email'
							value={email}
							onChange={e => setEmail(e.target.value)}
							className={styles.input}
						/>
					</div>

					<div className={styles.inputGroup}>
						<label htmlFor='password' className={styles.label}>
							Пароль
						</label>
						<div className={styles.inputWrap}>
							<input
								id='password'
								required
								type={show ? 'text' : 'password'}
								autoComplete='current-password'
								minLength={8}
								placeholder='Введите пароль (≥8)'
								value={password}
								onChange={e => setPassword(e.target.value)}
								className={styles.input}
							/>
							<button
								type='button'
								className={styles.toggleBtn}
								aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
								aria-pressed={show}
								onClick={() => setShow(s => !s)}
								title={show ? 'Скрыть пароль' : 'Показать пароль'}
							>
								{show ? <EyeOffIcon /> : <EyeIcon />}
							</button>
						</div>
					</div>

					<button type='submit' className={styles.button}>
						ВОЙТИ
					</button>
				</form>

				{error && <p className={styles.error}>{error}</p>}

				<p className={styles.signupText}>
					Нет аккаунта?{' '}
					<a href='/register' className={styles.signupLink}>
						Зарегистрироваться
					</a>
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
				<>
					<div className={styles.bg} aria-hidden />
					<div className={styles.container}>
						<div className={styles.card}>
							<h1 className={styles.title}>Вход</h1>
							<p>Loading…</p>
						</div>
					</div>
				</>
			}
		>
			<div className={styles.bg} aria-hidden />
			<LoginInner />
		</Suspense>
	)
}
