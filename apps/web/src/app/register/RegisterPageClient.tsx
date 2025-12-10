// apps/web/src/app/register/RegisterPageClient.tsx
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
	memo,
	useCallback,
	useEffect,
	useMemo,
	useState,
	type KeyboardEvent,
} from 'react'
import { useForm } from 'react-hook-form'

// Components
import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile'
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars'
import GoogleAuthButton from '@/src/components/auth/GoogleAuthButton'
import { EyeIcon, EyeOffIcon } from '@/src/components/ui/Icons'

// Hooks & Utils
import { useUsernameGenerator } from '@/src/hooks/useUsernameGenerator'
import { api, getUserMessage } from '@/src/lib/api'
import { GOOGLE_ENABLED } from '@/src/lib/flags'
import { measureStrength, strengthMeta } from '@/src/utils/passwordStrength'

// Schemas из shared (валидация без сообщений)
import { ClientRegisterForm, ClientRegisterSchema } from '@station-eden/shared'

// Styles
import styles from './page.module.css'

// Constants
const FORM_ANIMATION_DURATION = 340
const USERNAME_COOLDOWN = 120

// Memoized components
const MemoizedFireflies = memo(FirefliesProfile)
const MemoizedStars = memo(TwinklingStars)

interface FormState {
	showPassword: boolean
	showConfirmPassword: boolean
	capsLockOn: boolean
	error: string | null
	mounted: boolean
	shake: boolean
	genCooldown: boolean
}

export default function RegisterPageClient() {
	const searchParams = useSearchParams()
	const router = useRouter()

	// Form state
	const [formState, setFormState] = useState<FormState>({
		showPassword: false,
		showConfirmPassword: false,
		capsLockOn: false,
		error: null,
		mounted: false,
		shake: false,
		genCooldown: false,
	})

	// Form handling
	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors, isValid, isSubmitting },
	} = useForm<ClientRegisterForm>({
		resolver: zodResolver(ClientRegisterSchema),
		mode: 'onChange',
	})

	// Watched fields
	const password = watch('password', '')
	const confirm = watch('confirm', '')
	const username = watch('username', '')
	const email = watch('email', '')

	// Hooks
	const {
		generateUsername,
		loading: generating,
		isWasmSupported,
	} = useUsernameGenerator()

	// Effects
	useEffect(() => {
		setFormState(prev => ({ ...prev, mounted: true }))
	}, [])

	// Memoized values
	const strength = useMemo(() => measureStrength(password), [password])
	const strengthInfo = useMemo(() => strengthMeta(strength), [strength])
	const googleEnabled = GOOGLE_ENABLED
	const reason = searchParams.get('reason')

	const confirmHasValue = confirm.length > 0
	const confirmMatches = confirmHasValue && confirm === password
	const confirmInvalid = confirmHasValue && !confirmMatches

	// Event handlers
	const handleCapsLock = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
		const capsOn = e.getModifierState?.('CapsLock') ?? false
		setFormState(prev => ({ ...prev, capsLockOn: capsOn }))
	}, [])

	const handleGenerateUsername = useCallback(() => {
		if (formState.genCooldown) return

		setFormState(prev => ({ ...prev, genCooldown: true }))
		const newUsername = generateUsername()

		setValue('username', newUsername, {
			shouldValidate: true,
			shouldDirty: true,
		})

		setTimeout(() => {
			setFormState(prev => ({ ...prev, genCooldown: false }))
		}, USERNAME_COOLDOWN)
	}, [formState.genCooldown, generateUsername, setValue])

	const togglePasswordVisibility = useCallback(() => {
		setFormState(prev => ({ ...prev, showPassword: !prev.showPassword }))
	}, [])

	const toggleConfirmPasswordVisibility = useCallback(() => {
		setFormState(prev => ({
			...prev,
			showConfirmPassword: !prev.showConfirmPassword,
		}))
	}, [])

	const triggerShake = useCallback(() => {
		setFormState(prev => ({ ...prev, shake: true }))
		setTimeout(() => {
			setFormState(prev => ({ ...prev, shake: false }))
		}, FORM_ANIMATION_DURATION)
	}, [])

	// Form submission
	const onSubmit = useCallback(
		async (data: ClientRegisterForm) => {
			setFormState(prev => ({ ...prev, error: null }))

			try {
				const res = await api.register(data.email, data.username, data.password)

				if ((res as any)?.mfa === 'email_code_sent') {
					router.replace(
						`/login/verify?email=${encodeURIComponent(
							data.email
						)}&next=${encodeURIComponent('/profile')}`
					)
					return
				}

				throw new Error('Не удалось запустить подтверждение по почте')
			} catch (err: any) {
				setFormState(prev => ({
					...prev,
					error: getUserMessage(err, 'register'),
				}))
				triggerShake()
			}
		},
		[router, triggerShake]
	)

	const onError = useCallback(() => {
		triggerShake()
	}, [triggerShake])

	// Render helpers
	const renderPasswordStrength = useMemo(() => {
		if (password.length === 0 || errors.password) return null

		return (
			<>
				<div className={styles.strengthWrap} data-strength={strength}>
					<div
						className={styles.strengthBar}
						style={{ width: `${strengthInfo.percent}%` }}
					/>
				</div>
				<div className={styles.strengthLabel}>{strengthInfo.label}</div>
			</>
		)
	}, [password, errors.password, strength, strengthInfo])

	const renderCapsLockWarning = useMemo(() => {
		if (!formState.capsLockOn) return null

		return <div className={styles.capsTip}>Включён Caps&nbsp;Lock</div>
	}, [formState.capsLockOn])

	const renderPasswordMatch = useMemo(() => {
		if (!confirmMatches) return null

		return (
			<div className={`${styles.matchBadge} ${styles.show}`}>
				Пароли совпадают
			</div>
		)
	}, [confirmMatches])

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
						className={`${styles.form} ${formState.shake ? styles.isShaking : ''}`}
						onAnimationEnd={() =>
							formState.shake &&
							setFormState(prev => ({ ...prev, shake: false }))
						}
						noValidate
						autoComplete='on'
						aria-describedby={formState.error ? 'form-error' : undefined}
					>
						{/* Email Field */}
						<div className={styles.inputGroup}>
							<label htmlFor='email' className={styles.label}>
								Email
							</label>
							<input
								id='email'
								type='email'
								inputMode='email'
								autoComplete='email'
								placeholder='Введите email'
								className={`${styles.input} ${
									errors.email ? styles.invalid : email ? styles.valid : ''
								}`}
								{...register('email')}
								aria-invalid={!!errors.email}
							/>
							<p className={styles.pwHint}>
								Мы отправим на него код подтверждения.
							</p>
						</div>

						{/* Username Field */}
						<div className={styles.inputGroup}>
							<div className={styles.usernameHeader}>
								<label htmlFor='username' className={styles.label}>
									Username
								</label>
								<button
									type='button'
									onClick={handleGenerateUsername}
									disabled={generating || formState.genCooldown}
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
								placeholder='Придумайте ник'
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

							<p id='user-hint' className={styles.pwHint}>
								Доступны латиница, цифры и подчёркивание. Длина — 3–20 символов.
							</p>
						</div>

						{/* Password Field */}
						<div className={styles.inputGroup}>
							<label htmlFor='password' className={styles.label}>
								Пароль
							</label>
							<div className={styles.inputWrap}>
								<input
									id='password'
									type={formState.showPassword ? 'text' : 'password'}
									autoComplete='new-password'
									placeholder='Придумайте пароль'
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
									onClick={togglePasswordVisibility}
									title={
										formState.showPassword ? 'Скрыть пароль' : 'Показать пароль'
									}
								>
									{formState.showPassword ? <EyeOffIcon /> : <EyeIcon />}
								</button>
							</div>

							{renderPasswordStrength}
							{renderCapsLockWarning}
						</div>

						{/* Confirm Password Field */}
						<div className={styles.inputGroup}>
							<label htmlFor='confirm' className={styles.label}>
								Подтвердите пароль
							</label>
							<div className={styles.inputWrap}>
								<input
									id='confirm'
									type={formState.showConfirmPassword ? 'text' : 'password'}
									autoComplete='new-password'
									placeholder='Повторите пароль'
									className={`${styles.input} ${
										confirmInvalid
											? styles.invalid
											: confirmMatches
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
									onClick={toggleConfirmPasswordVisibility}
									title={
										formState.showConfirmPassword
											? 'Скрыть пароль'
											: 'Показать пароль'
									}
								>
									{formState.showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
								</button>
							</div>

							{renderPasswordMatch}
						</div>

						<button
							type='submit'
							className={`${styles.button} ${isSubmitting ? styles.loading : ''}`}
							disabled={!isValid || isSubmitting}
						>
							{isSubmitting ? 'Создаём аккаунт' : 'СОЗДАТЬ АККАУНТ'}
						</button>

						{formState.error && (
							<p id='form-error' className={styles.error} role='alert'>
								{formState.error}
							</p>
						)}
					</form>

					<p className={styles.swap}>
						Уже есть аккаунт?{' '}
						<Link href='/login' className={styles.link}>
							Войти
						</Link>
					</p>

					{formState.mounted && googleEnabled && (
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
