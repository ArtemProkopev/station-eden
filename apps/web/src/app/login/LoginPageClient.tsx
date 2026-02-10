// apps/web/src/app/login/LoginPageClient.tsx
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

// Components
import GoogleAuthButton from '@/components/auth/google/GoogleAuthButton'
import YandexAuthButton from '@/components/auth/yandex/YandexAuthButton'
import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile'
import { ClockIcon, EyeIcon, EyeOffIcon } from '@/components/ui/Icons'
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars'

// Hooks & Utils
import { useAuthLock } from '@/hooks/useAuthLock'
import { api, getUserMessage } from '@/lib/api'
import { clearForcedLogoutFlags } from '@/lib/authUtils'
import { GOOGLE_ENABLED, YANDEX_ENABLED } from '@/lib/flags'
import { clearLock, normLogin, writeLock } from '@/utils/authLock'
import { parseServerInfo } from '@/utils/serverInfoParser'
import {
	LoginDto,
	LoginResponse,
	LoginSchema,
	ServerLockInfo,
	UserData,
} from '@station-eden/shared'

// Styles
import styles from './page.module.css'

// Constants
const FORM_ANIMATION_DURATION = 340
const MAX_ATTEMPTS_UI = 5

// Memoized components
const MemoizedFireflies = memo(FirefliesProfile)
const MemoizedStars = memo(TwinklingStars)

interface FormState {
	showPassword: boolean
	error: string | null
	busy: boolean
	mounted: boolean
	shake: boolean
}

export default function LoginPageClient() {
	const router = useRouter()
	const searchParams = useSearchParams()

	// Form state
	const [formState, setFormState] = useState<FormState>({
		showPassword: false,
		error: null,
		busy: false,
		mounted: false,
		shake: false,
	})

	// Form handling
	const {
		register,
		handleSubmit,
		watch,
		formState: { errors, isValid, isSubmitting },
		setError,
	} = useForm<LoginDto>({
		resolver: zodResolver(LoginSchema),
		mode: 'onChange',
	})

	// Auth lock state
	const {
		lockedUntilIso,
		setLockedUntilIso,
		countdown,
		attemptsLeft,
		setAttemptsLeft,
		locked,
	} = useAuthLock()

	const lastLoginRef = useRef<string>('')
	const shakeTimeoutRef = useRef<number | null>(null)

	// Watched fields
	const login = watch('login', '')
	const password = watch('password', '')

	// Effects
	useEffect(() => {
		setFormState(prev => ({ ...prev, mounted: true }))
		return () => {
			if (shakeTimeoutRef.current) {
				window.clearTimeout(shakeTimeoutRef.current)
				shakeTimeoutRef.current = null
			}
		}
	}, [])

	// Memoized values
	const next = searchParams.get('next') || '/profile'
	const reason = searchParams.get('reason')

	const canSubmit = useMemo(() => {
		if (isSubmitting) return false
		if (locked) return false
		return isValid && login.length > 0 && password.length >= 1
	}, [isSubmitting, isValid, login, password, locked])

	const progressPct = useMemo(() => {
		if (attemptsLeft == null) return 0
		return Math.min(
			100,
			Math.round(((MAX_ATTEMPTS_UI - attemptsLeft) / MAX_ATTEMPTS_UI) * 100),
		)
	}, [attemptsLeft])

	const forgotHref = useMemo(
		() =>
			next ? `/login/forgot?next=${encodeURIComponent(next)}` : '/login/forgot',
		[next],
	)

	// Event handlers
	const handleParseAndSet = useCallback(
		(err: any) => {
			const info = parseServerInfo(err) as ServerLockInfo

			if (info.attemptsLeft !== undefined) {
				setAttemptsLeft(Number(info.attemptsLeft))
			}

			// Приоритет: lockedUntil (серверная точная дата) > lockedMinutes
			if (info.lockedUntil) {
				const parsed = Date.parse(info.lockedUntil)
				if (!Number.isNaN(parsed)) {
					const iso = new Date(parsed).toISOString()
					setLockedUntilIso(iso)
					writeLock(lastLoginRef.current || login || 'unknown', iso)
					return
				}
			}

			if (info.lockedMinutes !== undefined) {
				const until = new Date(
					Date.now() + Number(info.lockedMinutes) * 60 * 1000,
				)
				const iso = until.toISOString()
				setLockedUntilIso(iso)
				writeLock(lastLoginRef.current || login || 'unknown', iso)
			}
		},
		[login, setAttemptsLeft, setLockedUntilIso],
	)

	const triggerShake = useCallback(() => {
		setFormState(prev => ({ ...prev, shake: true }))
		if (shakeTimeoutRef.current) {
			window.clearTimeout(shakeTimeoutRef.current)
		}
		shakeTimeoutRef.current = window.setTimeout(() => {
			setFormState(prev => ({ ...prev, shake: false }))
			shakeTimeoutRef.current = null
		}, FORM_ANIMATION_DURATION)
	}, [])

	const togglePasswordVisibility = useCallback(() => {
		setFormState(prev => ({ ...prev, showPassword: !prev.showPassword }))
	}, [])

	const handleSuccessfulLogin = useCallback(
		(userData: UserData) => {
			// Сбрасываем флаги принудительного логаута / отключения keep-alive
			clearForcedLogoutFlags()

			if (typeof window !== 'undefined') {
				localStorage.setItem('authToken', userData.token)
				localStorage.setItem('userData', JSON.stringify(userData))

				// Событие для других частей приложения
				window.dispatchEvent(new Event('authChange'))

				// Если где-то слушают storage "в этой же вкладке" — имитируем (как было)
				window.dispatchEvent(
					new StorageEvent('storage', {
						key: 'authToken',
						newValue: userData.token,
						storageArea: localStorage,
					}),
				)
			}

			clearLock()
			router.replace(next)
		},
		[router, next],
	)

	const onSubmit = useCallback(
		async (data: LoginDto) => {
			if (!canSubmit) {
				triggerShake()
				return
			}

			setFormState(prev => ({ ...prev, error: null, busy: true }))
			lastLoginRef.current = normLogin(data.login)

			try {
				const res = await api.login(data.login, data.password)
				const response = res as LoginResponse

				// MFA по email
				if (response.mfa === 'email_code_sent') {
					const needSet = response.needSetPassword === true
					const queryParams = new URLSearchParams({
						email: response.email || '',
						next,
						...(needSet ? { mode: 'set_password' } : {}),
					})

					clearLock()
					router.replace(`/login/verify?${queryParams.toString()}`)
					return
				}

				// Сохраняем данные пользователя
				const userData: UserData = {
					id: response.user?.id || response.id || 'unknown',
					email: response.user?.email || response.email || data.login,
					username: response.user?.username || response.username || data.login,
					avatar: response.user?.avatar || response.avatar,
					token: response.token || response.access_token || 'auth-token',
				}

				handleSuccessfulLogin(userData)
			} catch (err: any) {
				const errorMessage = getUserMessage(err, 'login')
				setFormState(prev => ({
					...prev,
					error: errorMessage,
				}))

				// Устанавливаем ошибку в форму для конкретных полей если нужно (сервер)
				if ((err as any).fieldErrors) {
					Object.entries((err as any).fieldErrors).forEach(
						([field, message]) => {
							setError(field as keyof LoginDto, {
								type: 'server',
								message: Array.isArray(message) ? message[0] : String(message),
							})
						},
					)
				}

				handleParseAndSet(err)
				triggerShake()
			} finally {
				setFormState(prev => ({ ...prev, busy: false }))
			}
		},
		[
			canSubmit,
			next,
			router,
			handleParseAndSet,
			triggerShake,
			handleSuccessfulLogin,
			setError,
		],
	)

	const onError = useCallback(() => {
		triggerShake()
	}, [triggerShake])

	// Render helpers
	const renderLockPills = useMemo(
		() => (
			<div className={styles.pillRow} aria-live='polite'>
				{locked && (
					<div className={`${styles.pill} ${styles.pillLock}`} role='status'>
						<span className={styles.iconWrap}>
							<ClockIcon />
						</span>
						<span className={styles.pillLabel}>Блокировка</span>
						<span className={styles.timerBadge}>
							<span className={styles.timerDigits}>{countdown}</span>
						</span>
					</div>
				)}
				{!locked && attemptsLeft !== null && (
					<div className={`${styles.pill} ${styles.pillWarn}`} role='status'>
						<span className={styles.pillLabel}>Неверный логин или пароль</span>
						<span className={styles.sep} aria-hidden='true' />
						<span className={styles.pillLabel}>Осталось попыток</span>
						<span className={styles.pillValue}>{attemptsLeft}</span>
						<span className={styles.meterWrap} aria-hidden='true'>
							<span
								className={styles.meterFill}
								style={{ width: `${progressPct}%` }}
							/>
						</span>
					</div>
				)}
			</div>
		),
		[locked, countdown, attemptsLeft, progressPct],
	)

	const renderReasonMessage = useMemo(() => {
		if (!reason) return null

		const messages = {
			google_exists:
				'Аккаунт с этим Google-email уже существует — просто войдите.',
			google_no_account:
				'Похоже, такого аккаунта ещё нет. Вы можете зарегистрироваться.',
			yandex_exists:
				'Аккаунт с этим Яндекс-email уже существует — просто войдите.',
			yandex_no_account:
				'Похоже, такого аккаунта ещё нет. Вы можете зарегистрироваться.',
		}

		return (
			<p className={`${styles.notice} ${styles.info}`} role='status'>
				{messages[reason as keyof typeof messages]}
			</p>
		)
	}, [reason])

	return (
		<main className={styles.page}>
			<MemoizedFireflies />
			<MemoizedStars />

			<div className={styles.container}>
				<section className={styles.card} aria-labelledby='login-title'>
					<header className={styles.header}>
						<h1 id='login-title' className={styles.title}>
							Вход
						</h1>
					</header>

					{renderReasonMessage}
					{renderLockPills}

					<form
						onSubmit={handleSubmit(onSubmit, onError)}
						className={`${styles.form} ${formState.shake ? styles.isShaking : ''}`}
						onAnimationEnd={() =>
							formState.shake &&
							setFormState(prev => ({ ...prev, shake: false }))
						}
						noValidate
						autoComplete='on'
						aria-describedby={
							formState.error && attemptsLeft === null && !locked
								? 'login-error'
								: undefined
						}
					>
						{/* Login Field */}
						<div className={styles.inputGroup}>
							<label htmlFor='login' className={styles.label}>
								Email или username
							</label>
							<input
								id='login'
								type='text'
								spellCheck={false}
								autoCorrect='off'
								autoCapitalize='none'
								autoComplete='username email'
								placeholder='Введите email или username'
								className={`${styles.input} ${
									errors.login ? styles.invalid : login ? styles.valid : ''
								}`}
								{...register('login')}
								aria-invalid={!!errors.login}
								disabled={locked}
							/>
							{errors.login?.message && (
								<p className={styles.errorText}>{errors.login.message}</p>
							)}
						</div>

						{/* Password Field */}
						<div className={styles.inputGroup}>
							<div className={styles.labelRow}>
								<label htmlFor='password' className={styles.label}>
									Пароль
								</label>
								<Link href={forgotHref} className={styles.forgotInline}>
									Забыли пароль?
								</Link>
							</div>
							<div className={styles.inputWrap}>
								<input
									id='password'
									type={formState.showPassword ? 'text' : 'password'}
									autoComplete='current-password'
									placeholder='Введите пароль'
									className={`${styles.input} ${
										errors.password
											? styles.invalid
											: password
												? styles.valid
												: ''
									}`}
									{...register('password')}
									aria-invalid={!!errors.password}
									disabled={locked}
								/>
								<button
									type='button'
									className={styles.toggleBtn}
									aria-label={
										formState.showPassword ? 'Скрыть пароль' : 'Показать пароль'
									}
									aria-pressed={formState.showPassword}
									onClick={togglePasswordVisibility}
									title={
										formState.showPassword ? 'Скрыть пароль' : 'Показать пароль'
									}
									disabled={locked}
								>
									{formState.showPassword ? <EyeOffIcon /> : <EyeIcon />}
								</button>
							</div>
							{errors.password?.message && (
								<p className={styles.errorText}>{errors.password.message}</p>
							)}
						</div>

						<button
							type='submit'
							className={`${styles.button} ${formState.busy ? styles.loading : ''}`}
							disabled={!canSubmit}
							aria-disabled={!canSubmit}
						>
							{locked ? 'Заблокировано…' : formState.busy ? 'Входим' : 'ВОЙТИ'}
						</button>

						{formState.error && attemptsLeft === null && !locked && (
							<p id='login-error' className={styles.error} role='alert'>
								{formState.error}
							</p>
						)}
					</form>

					<p className={styles.swap}>
						Нет аккаунта?{' '}
						<Link href='/register' className={styles.link}>
							Зарегистрироваться
						</Link>
					</p>

					{formState.mounted && GOOGLE_ENABLED && (
						<>
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

					{formState.mounted && YANDEX_ENABLED && (
						<>
							<div
								className={styles.hr}
								role='separator'
								aria-label='Или через Яндекс'
							>
								<span>Или через Яндекс</span>
							</div>
							<div className={styles.oauthBlock}>
								<YandexAuthButton
									label='Войти с Яндекс ID'
									mode='login'
									size='m'
									next={next}
								/>
							</div>
						</>
					)}
				</section>
			</div>
		</main>
	)
}
