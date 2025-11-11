// apps/web/src/app/register/page.tsx
'use client'

import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile'
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars'
import GoogleAuthButton from '@/src/components/auth/GoogleAuthButton'
import { useUsernameGenerator } from '@/src/hooks/useUsernameGenerator'
import { api, getUserMessage } from '@/src/lib/api'
import { GOOGLE_ENABLED } from '@/src/lib/flags'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { memo, useEffect, useMemo, useState } from 'react'
import styles from './page.module.css'

const MemoizedFireflies = memo(FirefliesProfile)
const MemoizedStars = memo(TwinklingStars)

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
		>
			<path d='M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a21.8 21.8 0 0 1 4.22-4.92' />
			<path d='M9.88 9.88a3 3 0 1 0 4.24 4.24' />
			<path d='M10.58 4.1A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-3.12 3.91' />
			<line x1='1' y1='1' x2='23' y2='23' />
		</svg>
	)
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const userRe = /^[a-zA-Z0-9_]{3,20}$/

const hasLower = (s: string) => /[a-z]/.test(s)
const hasUpper = (s: string) => /[A-Z]/.test(s)
const hasDigit = (s: string) => /\d/.test(s)
const hasSpecial = (s: string) => /[^A-Za-z0-9]/.test(s)

function measureStrength(pw: string): number {
	let score = 0
	if (pw.length >= 8) score++
	if (pw.length >= 12) score++
	if (hasLower(pw)) score++
	if (hasUpper(pw)) score++
	if (hasDigit(pw)) score++
	if (hasSpecial(pw)) score++
	return Math.min(5, Math.max(0, score))
}

function strengthMeta(score: number) {
	const steps = [0, 20, 40, 65, 85, 100]
	const labels = [
		'Очень слабый',
		'Слабый',
		'Ниже среднего',
		'Средний',
		'Хороший',
		'Сильный',
	]
	const idx = Math.max(0, Math.min(5, score))
	return { percent: steps[idx], label: labels[idx] }
}

export default function RegisterPage() {
	const [email, setEmail] = useState('')
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [confirm, setConfirm] = useState('')

	const [emailTouched, setEmailTouched] = useState(false)
	const [userTouched, setUserTouched] = useState(false)
	const [pwTouched, setPwTouched] = useState(false)
	const [confirmTouched, setConfirmTouched] = useState(false)

	const [show, setShow] = useState(false)
	const [showConfirm, setShowConfirm] = useState(false)

	const [capsOn, setCapsOn] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)
	const [mounted, setMounted] = useState(false)
	const [shake, setShake] = useState(false)

	// Анти-даблклик: краткий локальный троттлинг.
	const [genCooldown, setGenCooldown] = useState(false)

	const sp = useSearchParams()
	const reason = sp.get('reason')
	const router = useRouter()

	const {
		generateUsername,
		loading: generating,
		isWasmSupported,
	} = useUsernameGenerator()

	useEffect(() => setMounted(true), [])

	const strength = useMemo(() => measureStrength(password), [password])
	const { percent, label } = useMemo(() => strengthMeta(strength), [strength])

	const isEmailValid = emailRe.test(email)
	const isUserValid = userRe.test(username)
	const isPwValid = password.length >= 8
	const match = confirm.length > 0 && confirm === password

	const canSubmit = isEmailValid && isUserValid && isPwValid && match && !busy

	function handleCapsLock(e: React.KeyboardEvent<HTMLInputElement>) {
		const on =
			typeof e.getModifierState === 'function'
				? e.getModifierState('CapsLock')
				: false
		setCapsOn(Boolean(on))
	}

	const handleGenerateUsername = () => {
		if (genCooldown) return
		setGenCooldown(true)
		const newUsername = generateUsername()
		setUsername(newUsername)
		if (!userTouched) setUserTouched(true)
		setTimeout(() => setGenCooldown(false), 120)
	}

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
			const res = await api.register(email, username, password)
			if ((res as any)?.mfa === 'email_code_sent') {
				router.replace(
					`/login/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent('/profile')}`
				)
				return
			}
			throw new Error('Не удалось запустить подтверждение по почте')
		} catch (err: any) {
			setError(getUserMessage(err, 'register'))
			setShake(true)
			setTimeout(() => setShake(false), 340)
		} finally {
			setBusy(false)
		}
	}

	const googleEnabled = GOOGLE_ENABLED

	return (
		<>
			<main className={styles.page}>
				<MemoizedFireflies />
				<MemoizedStars />

				<div className={styles.container}>
					<section className={styles.card} aria-labelledby='reg-title'>
						<header className={styles.header}>
							<h1 id='reg-title' className={styles.title}>
								Регистрация
							</h1>
						</header>

						{reason === 'google_no_account' && (
							<p className={`${styles.notice} ${styles.info}`} role='status'>
								Такого Google-аккаунта у нас ещё нет — вы можете
								зарегистрироваться сейчас.
							</p>
						)}

						<form
							onSubmit={onSubmit}
							className={`${styles.form} ${shake ? styles.isShaking : ''}`}
							onAnimationEnd={() => shake && setShake(false)}
							noValidate
							autoComplete='on'
							aria-describedby={error ? 'form-error' : undefined}
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
									onChange={e => {
										if (!emailTouched) setEmailTouched(true)
										setEmail(e.target.value.trimStart())
									}}
									className={`${styles.input} ${
										emailTouched
											? isEmailValid
												? styles.valid
												: styles.invalid
											: ''
									}`}
									aria-invalid={emailTouched ? !isEmailValid : undefined}
								/>
							</div>

							<div className={styles.inputGroup}>
								<div className={styles.usernameHeader}>
									<label htmlFor='username' className={styles.label}>
										Username
									</label>
									<button
										type='button'
										onClick={handleGenerateUsername}
										disabled={generating || genCooldown}
										className={styles.generateBtn}
										title={
											isWasmSupported
												? 'Сгенерировать ник с помощью WebAssembly'
												: 'Сгенерировать случайный ник'
										}
									>
										{generating ? 'Генерируем…' : 'Сгенерировать'}
									</button>
								</div>

								<input
									id='username'
									name='username'
									required
									type='text'
									inputMode='text'
									spellCheck={false}
									autoCorrect='off'
									autoCapitalize='none'
									autoComplete='username'
									placeholder='Придумайте ник (3–20, a–Z, 0–9, _ )'
									value={username}
									onChange={e => {
										if (!userTouched) setUserTouched(true)
										setUsername(e.target.value.trim())
									}}
									className={`${styles.input} ${
										userTouched
											? isUserValid
												? styles.valid
												: styles.invalid
											: ''
									}`}
									aria-invalid={userTouched ? !isUserValid : undefined}
									aria-describedby='user-hint'
								/>

								<p id='user-hint' className={styles.pwHint}>
									Доступны латиница, цифры и подчёркивание. Длина — 3–20
									символов.
								</p>
							</div>

							<div className={styles.inputGroup}>
								<label htmlFor='password' className={styles.label}>
									Пароль
								</label>
								<div className={styles.inputWrap}>
									<input
										id='password'
										name='new-password'
										required
										type={show ? 'text' : 'password'}
										autoComplete='new-password'
										minLength={8}
										placeholder='Введите пароль (≥8)'
										value={password}
										onChange={e => {
											if (!pwTouched) setPwTouched(true)
											setPassword(e.target.value)
										}}
										onKeyDown={handleCapsLock}
										onKeyUp={handleCapsLock}
										className={`${styles.input} ${
											pwTouched
												? isPwValid
													? styles.valid
													: styles.invalid
												: ''
										}`}
										aria-invalid={pwTouched ? !isPwValid : undefined}
										aria-describedby='pw-hint'
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

								{pwTouched && password.length > 0 && (
									<>
										<div
											className={styles.strengthWrap}
											data-strength={strength}
											role='status'
											aria-live='polite'
											aria-label={`Надёжность пароля: ${label}`}
										>
											<div
												className={styles.strengthBar}
												style={{ width: `${percent}%` }}
											/>
										</div>
										<div className={styles.strengthLabel}>{label}</div>
									</>
								)}

								<p id='pw-hint' className={styles.pwHint}>
									Рекомендуем 8+ символов и комбинацию букв разного регистра,
									цифр и спецсимволов.
								</p>

								{capsOn && (
									<div className={styles.capsTip}>Включён Caps&nbsp;Lock</div>
								)}
							</div>

							<div className={styles.inputGroup}>
								<label htmlFor='confirm' className={styles.label}>
									Подтвердите пароль
								</label>
								<div className={styles.inputWrap}>
									<input
										id='confirm'
										name='confirm-password'
										required
										type={showConfirm ? 'text' : 'password'}
										autoComplete='new-password'
										minLength={8}
										placeholder='Повторите пароль'
										value={confirm}
										onChange={e => {
											if (!confirmTouched) setConfirmTouched(true)
											setConfirm(e.target.value)
										}}
										onKeyDown={handleCapsLock}
										onKeyUp={handleCapsLock}
										className={`${styles.input} ${
											confirmTouched
												? confirm.length > 0 && confirm === password
													? styles.valid
													: styles.invalid
												: ''
										}`}
										aria-invalid={
											confirmTouched
												? !(confirm.length > 0 && confirm === password)
												: undefined
										}
									/>
									<button
										type='button'
										className={styles.toggleBtn}
										aria-label={
											showConfirm ? 'Скрыть пароль' : 'Показать пароль'
										}
										aria-pressed={showConfirm}
										onClick={() => setShowConfirm(s => !s)}
										title={showConfirm ? 'Скрыть пароль' : 'Показать пароль'}
									>
										{showConfirm ? <EyeOffIcon /> : <EyeIcon />}
									</button>
								</div>

								{confirmTouched && confirm.length > 0 && (
									<div
										className={`${styles.matchBadge} ${confirm === password ? styles.show : ''}`}
										role='status'
										aria-live='polite'
									>
										{confirm === password
											? 'Пароли совпадают'
											: 'Пароли не совпадают'}
									</div>
								)}
							</div>

							<button
								type='submit'
								className={`${styles.button} ${busy ? styles.loading : ''}`}
								disabled={!canSubmit || busy}
								aria-disabled={!canSubmit || busy}
							>
								{busy ? 'Создаём аккаунт' : 'СОЗДАТЬ АККАУНТ'}
							</button>

							{error && (
								<p id='form-error' className={styles.error} role='alert'>
									{error}
								</p>
							)}
						</form>

						<p className={styles.swap}>
							Уже есть аккаунт?{' '}
							<Link href='/login' className={styles.link}>
								Войти
							</Link>
						</p>

						{mounted && googleEnabled && (
							<>
								<div
									className={styles.hr}
									role='separator'
									aria-label='Или через Google'
								>
									<span>Или через Google</span>
								</div>
								<div className={styles.oauthBlock}>
									<GoogleAuthButton
										mode='register'
										label='Продолжить с Google'
									/>
								</div>
							</>
						)}
					</section>
				</div>
			</main>
		</>
	)
}
