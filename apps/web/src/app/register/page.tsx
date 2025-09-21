'use client'
import { api } from '@/src/lib/api'
import Link from 'next/link'
import { useState } from 'react'
import styles from './page.module.css'

/** Контурные иконки (fill="none"), цвет — currentColor из .toggleBtn */
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
	const [ok, setOk] = useState(false)

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)
		setOk(false)
		try {
			await api.register(email, password)
			setOk(true)
		} catch (err: any) {
			setError(err.message || 'Ошибка регистрации')
		}
	}

	return (
		<>
			<div className={styles.bg} aria-hidden />

			<div className={styles.container}>
				<div className={styles.card}>
					<h1 className={styles.title}>Регистрация</h1>

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

					{ok && (
						<p className={styles.ok}>
							Готово! Теперь{' '}
							<Link href='/login' className={styles.link}>
								войдите
							</Link>
							.
						</p>
					)}
					{error && <p className={styles.error}>{error}</p>}

					<p className={styles.swap}>
						Уже есть аккаунт?{' '}
						<Link href='/login' className={styles.link}>
							Войти
						</Link>
					</p>
				</div>
			</div>
		</>
	)
}
