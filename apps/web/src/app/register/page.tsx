'use client'

import GoogleAuthButton from '@/src/components/auth/GoogleAuthButton'
import { api, getUserMessage } from '@/src/lib/api'
import { GOOGLE_ENABLED } from '@/src/lib/flags'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
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

export default function RegisterPage() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [show, setShow] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [mounted, setMounted] = useState(false)
	const sp = useSearchParams()
	const reason = sp.get('reason')
	const router = useRouter()

	useEffect(() => setMounted(true), [])

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)
		try {
			const res = await api.register(email, password)
			if ((res as any)?.mfa === 'email_code_sent') {
				router.replace(
					`/login/verify?email=${encodeURIComponent(
						email
					)}&next=${encodeURIComponent('/profile')}`
				)
				return
			}
			// если сервер внезапно не вернул mfa
			throw new Error('Не удалось запустить подтверждение по почте')
		} catch (err: any) {
			setError(getUserMessage(err, 'register'))
		}
	}

	const googleEnabled = GOOGLE_ENABLED

	return (
		<>
			<div className={styles.bg} aria-hidden />
			<div className={styles.container}>
				<div className={styles.card}>
					<h1 className={styles.title}>Регистрация</h1>

					{reason === 'google_no_account' && (
						<div className={`${styles.notice} ${styles.info}`} role='status'>
							Такого Google-аккаунта у нас ещё нет — вы можете
							зарегистрироваться сейчас.
						</div>
					)}

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
									autoComplete='new-password'
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
							СОЗДАТЬ АККАУНТ
						</button>
					</form>

					{error && <p className={styles.error}>{error}</p>}

					<p className={styles.swap}>
						Уже есть аккаунт?{' '}
						<Link href='/login' className={styles.link}>
							Войти
						</Link>
					</p>

					{mounted && googleEnabled && (
						<>
							<hr className={styles.hr} />
							<div className={styles.oauthBlock}>
								<div className={styles.oauthCaption}>Или через Google</div>
								<GoogleAuthButton mode='register' label='Продолжить с Google' />
							</div>
						</>
					)}
				</div>
			</div>
		</>
	)
}
