// apps/web/src/app/register/RegisterPageClient.tsx
'use client'

import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile'
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars'
import GoogleAuthButton from '@/src/components/auth/GoogleAuthButton'
import { useUsernameGenerator } from '@/src/hooks/useUsernameGenerator'
import { api, getUserMessage } from '@/src/lib/api'
import { GOOGLE_ENABLED } from '@/src/lib/flags'
import { zodResolver } from '@hookform/resolvers/zod'
import { RegisterSchema } from '@station-eden/shared'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { memo, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import styles from './page.module.css'

const MemoizedFireflies = memo(FirefliesProfile)
const MemoizedStars = memo(TwinklingStars)

// Расширяем схему для фронтенда (добавляем confirm password)
const ClientRegisterSchema = RegisterSchema.extend({
	confirm: z.string(),
}).refine(data => data.password === data.confirm, {
	message: 'Пароли не совпадают',
	path: ['confirm'],
})

type ClientRegisterForm = z.infer<typeof ClientRegisterSchema>

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

const hasLower = (s: string) => /[a-z]/.test(s)
const hasUpper = (s: string) => /[A-Z]/.test(s)
const hasDigit = (s: string) => /\d/.test(s)
const hasSpecial = (s: string) => /[^A-Za-z0-9]/.test(s)

function measureStrength(pw: string): number {
	let score = 0
	if (!pw) return 0
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

export default function RegisterPageClient() {
	const {
		register,
		handleSubmit,
		setValue,
		watch,
		trigger,
		formState: { errors, isValid, isSubmitting },
	} = useForm<ClientRegisterForm>({
		resolver: zodResolver(ClientRegisterSchema),
		mode: 'onChange',
	})

	const password = watch('password', '')
	const confirm = watch('confirm', '')
	const username = watch('username', '')

	const [show, setShow] = useState(false)
	const [showConfirm, setShowConfirm] = useState(false)
	const [capsOn, setCapsOn] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [mounted, setMounted] = useState(false)
	const [shake, setShake] = useState(false)
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
		setValue('username', newUsername, {
			shouldValidate: true,
			shouldDirty: true,
		})
		setTimeout(() => setGenCooldown(false), 120)
	}

	const onSubmit = async (data: ClientRegisterForm) => {
		setError(null)
		try {
			const res = await api.register(data.email, data.username, data.password)
			if ((res as any)?.mfa === 'email_code_sent') {
				router.replace(
					`/login/verify?email=${encodeURIComponent(data.email)}&next=${encodeURIComponent('/profile')}`
				)
				return
			}
			throw new Error('Не удалось запустить подтверждение по почте')
		} catch (err: any) {
			setError(getUserMessage(err, 'register'))
			setShake(true)
			setTimeout(() => setShake(false), 340)
		}
	}

	const onError = () => {
		setShake(true)
		setTimeout(() => setShake(false), 340)
	}

	const googleEnabled = GOOGLE_ENABLED

	return (
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
						onSubmit={handleSubmit(onSubmit, onError)}
						className={`${styles.form} ${shake ? styles.isShaking : ''}`}
						onAnimationEnd={() => shake && setShake(false)}
						noValidate
						autoComplete='on'
						aria-describedby={error ? 'form-error' : undefined}
					>
						{/* EMAIL */}
						<div className={styles.inputGroup}>
							<label htmlFor='email' className={styles.label}>
								Email
							</label>
							<input
								id='email'
								type='email'
								inputMode='email'
								autoComplete='email'
								placeholder='Введите свой email'
								className={`${styles.input} ${
									errors.email
										? styles.invalid
										: watch('email')
											? styles.valid
											: ''
								}`}
								{...register('email')}
								aria-invalid={!!errors.email}
							/>
						</div>

						{/* USERNAME */}
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
								type='text'
								autoComplete='username'
								placeholder='Придумайте ник (3–20, a–Z, 0–9, _ )'
								className={`${styles.input} ${
									errors.username
										? styles.invalid
										: username
											? styles.valid
											: ''
								}`}
								{...register('username')}
								aria-invalid={!!errors.username}
								aria-describedby='user-hint'
							/>

							{errors.username ? (
								<p className={styles.errorText}>{errors.username.message}</p>
							) : (
								<p id='user-hint' className={styles.pwHint}>
									Доступны латиница, цифры и подчёркивание. Длина — 3–20
									символов.
								</p>
							)}
						</div>

						{/* PASSWORD */}
						<div className={styles.inputGroup}>
							<label htmlFor='password' className={styles.label}>
								Пароль
							</label>
							<div className={styles.inputWrap}>
								<input
									id='password'
									type={show ? 'text' : 'password'}
									autoComplete='new-password'
									placeholder='Введите пароль (≥8)'
									className={`${styles.input} ${
										errors.password
											? styles.invalid
											: password
												? styles.valid
												: ''
									}`}
									{...register('password')}
									onKeyDown={handleCapsLock}
									onKeyUp={handleCapsLock}
									aria-invalid={!!errors.password}
								/>
								<button
									type='button'
									className={styles.toggleBtn}
									onClick={() => setShow(s => !s)}
									title={show ? 'Скрыть пароль' : 'Показать пароль'}
								>
									{show ? <EyeOffIcon /> : <EyeIcon />}
								</button>
							</div>

							{errors.password && (
								<p className={styles.errorText}>{errors.password.message}</p>
							)}

							{password.length > 0 && !errors.password && (
								<>
									<div className={styles.strengthWrap} data-strength={strength}>
										<div
											className={styles.strengthBar}
											style={{ width: `${percent}%` }}
										/>
									</div>
									<div className={styles.strengthLabel}>{label}</div>
								</>
							)}

							{capsOn && (
								<div className={styles.capsTip}>Включён Caps&nbsp;Lock</div>
							)}
						</div>

						{/* CONFIRM PASSWORD */}
						<div className={styles.inputGroup}>
							<label htmlFor='confirm' className={styles.label}>
								Подтвердите пароль
							</label>
							<div className={styles.inputWrap}>
								<input
									id='confirm'
									type={showConfirm ? 'text' : 'password'}
									autoComplete='new-password'
									placeholder='Повторите пароль'
									className={`${styles.input} ${
										errors.confirm
											? styles.invalid
											: confirm
												? styles.valid
												: ''
									}`}
									{...register('confirm')}
									onKeyDown={handleCapsLock}
									onKeyUp={handleCapsLock}
								/>
								<button
									type='button'
									className={styles.toggleBtn}
									onClick={() => setShowConfirm(s => !s)}
								>
									{showConfirm ? <EyeOffIcon /> : <EyeIcon />}
								</button>
							</div>

							{confirm.length > 0 && (
								<div
									className={`${styles.matchBadge} ${
										!errors.confirm && confirm === password ? styles.show : ''
									}`}
								>
									{!errors.confirm && confirm === password
										? 'Пароли совпадают'
										: errors.confirm?.message}
								</div>
							)}
						</div>

						<button
							type='submit'
							className={`${styles.button} ${isSubmitting ? styles.loading : ''}`}
							disabled={!isValid || isSubmitting}
						>
							{isSubmitting ? 'Создаём аккаунт' : 'СОЗДАТЬ АККАУНТ'}
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
								<GoogleAuthButton mode='register' label='Продолжить с Google' />
							</div>
						</>
					)}
				</section>
			</div>
		</main>
	)
}
