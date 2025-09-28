'use client'

import GoogleAuthButton from '@/src/components/auth/GoogleAuthButton'
import { api, getUserMessage } from '@/src/lib/api'
import { GOOGLE_ENABLED } from '@/src/lib/flags'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import styles from './page.module.css'

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
			focusable='false'
			width='20'
			height='20'
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
			focusable='false'
			width='20'
			height='20'
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
	const [busy, setBusy] = useState(false)
	const [mounted, setMounted] = useState(false)
	const [shake, setShake] = useState(false)

	const router = useRouter()
	const sp = useSearchParams()
	const next = sp.get('next') || '/profile'
	const reason = sp.get('reason')

	useEffect(() => setMounted(true), [])

	const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	const canSubmit = useMemo(() => {
		if (busy) return false
		return emailRe.test(email) && password.length >= 8
	}, [busy, email, password.length])

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		if (!canSubmit) {
			setShake(true)
			setTimeout(() => setShake(false), 340)
			return
		}
		setError(null)
		setBusy(true)
		try {
			const res = await api.login(email, password)
			if ((res as any)?.mfa === 'email_code_sent') {
				const needSet = (res as any)?.needSetPassword === true
				const q = new URLSearchParams({
					email,
					next,
					...(needSet ? { mode: 'set_password' } : {}),
				})
				router.replace(`/login/verify?${q.toString()}`)
				return
			}
			router.replace(next)
		} catch (err: any) {
			setError(getUserMessage(err, 'login'))
			setShake(true)
			setTimeout(() => setShake(false), 340)
		} finally {
			setBusy(false)
		}
	}

	const googleEnabled = GOOGLE_ENABLED

	return (
		<>
			<div className={styles.bg} aria-hidden />
			<main className={styles.container}>
				<section className={styles.card} aria-labelledby='login-title'>
					<header>
						<h1 id='login-title' className={styles.title}>
							Вход
						</h1>
					</header>

					{reason === 'google_exists' && (
						<p className={`${styles.notice} ${styles.info}`} role='status'>
							Аккаунт с этим Google-email уже существует — просто войдите.
						</p>
					)}
					{reason === 'google_no_account' && (
						<p className={`${styles.notice} ${styles.info}`} role='status'>
							Похоже, такого аккаунта ещё нет. Вы можете зарегистрироваться.
						</p>
					)}

					<form
						onSubmit={onSubmit}
						className={`${styles.form} ${shake ? styles.isShaking : ''}`}
						onAnimationEnd={() => shake && setShake(false)}
						noValidate
						autoComplete='on'
						aria-describedby={error ? 'login-error' : undefined}
					>
						<div className={styles.inputGroup}>
							<label htmlFor='email' className={styles.label}>
								Email
							</label>
							<input
								id='email'
								name='email'
								required
								type='email'
								inputMode='email'
								spellCheck={false}
								autoCorrect='off'
								autoCapitalize='none'
								autoComplete='email'
								placeholder='Введите свой email'
								value={email}
								onChange={e => setEmail(e.target.value.trimStart())}
								className={styles.input}
								aria-invalid={
									email.length > 0 ? !emailRe.test(email) : undefined
								}
							/>
						</div>

						<div className={styles.inputGroup}>
							<label htmlFor='password' className={styles.label}>
								Пароль
							</label>
							<div className={styles.inputWrap}>
								<input
									id='password'
									name='current-password'
									required
									type={show ? 'text' : 'password'}
									autoComplete='current-password'
									minLength={8}
									placeholder='Введите пароль (≥8)'
									value={password}
									onChange={e => setPassword(e.target.value)}
									className={styles.input}
									aria-invalid={
										password.length > 0 ? password.length < 8 : undefined
									}
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

						<button
							type='submit'
							className={`${styles.button} ${busy ? styles.loading : ''}`}
							disabled={!canSubmit}
							aria-disabled={!canSubmit}
						>
							{busy ? 'Входим' : 'ВОЙТИ'}
						</button>

						{error && (
							<p id='login-error' className={styles.error} role='alert'>
								{error}
							</p>
						)}
					</form>

					<p className={styles.swap}>
						Нет аккаунта?{' '}
						<Link href='/register' className={styles.link}>
							Зарегистрироваться
						</Link>
					</p>

					{mounted && googleEnabled && (
						<>
							{/* Разделитель с текстом внутри линии */}
							<div
								className={styles.hr}
								role='separator'
								aria-label='Или через Google'
							>
								<span>Или через Google</span>
							</div>

							<div className={styles.oauthBlock}>
								<GoogleAuthButton label='Войти с Google' mode='login' />
							</div>
						</>
					)}
				</section>
			</main>
		</>
	)
}

export default function LoginPage() {
	return (
		<Suspense
			fallback={
				<>
					<div className={styles.bg} aria-hidden />
					<main className={styles.container}>
						<section className={styles.card}>
							<h1 className={styles.title}>Вход</h1>
							<p>Loading…</p>
						</section>
					</main>
				</>
			}
		>
			<LoginInner />
		</Suspense>
	)
}
