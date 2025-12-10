// apps/web/src/app/login/forgot/ForgotPasswordPageClient.tsx
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { memo, useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

// UI
import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile'
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars'

// API
import { api, getUserMessage } from '@/src/lib/api'

// Стили — переиспользуем login/page.module.css
import styles from '../page.module.css'

const MemoizedFireflies = memo(FirefliesProfile)
const MemoizedStars = memo(TwinklingStars)

const ForgotPasswordSchema = z.object({
	email: z.string().email('Некорректный email'),
})

type ForgotForm = z.infer<typeof ForgotPasswordSchema>

interface FormState {
	error: string | null
	success: boolean
	busy: boolean
	shake: boolean
	mounted: boolean
}

export default function ForgotPasswordPageClient() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const next = searchParams.get('next') || '/profile'

	const [formState, setFormState] = useState<FormState>({
		error: null,
		success: false,
		busy: false,
		shake: false,
		mounted: false,
	})

	const {
		register,
		handleSubmit,
		formState: { errors, isValid, isSubmitting },
		watch,
	} = useForm<ForgotForm>({
		resolver: zodResolver(ForgotPasswordSchema),
		mode: 'onChange',
	})

	const email = watch('email', '')

	useEffect(() => {
		setFormState(prev => ({ ...prev, mounted: true }))
	}, [])

	const triggerShake = useCallback(() => {
		setFormState(prev => ({ ...prev, shake: true }))
		setTimeout(() => {
			setFormState(prev => ({ ...prev, shake: false }))
		}, 340)
	}, [])

	const onSubmit = useCallback(
		async (data: ForgotForm) => {
			setFormState(prev => ({ ...prev, error: null, busy: true }))
			try {
				await api.forgotPassword(data.email)

				// UX: сразу уходим на экран кода + нового пароля
				const params = new URLSearchParams({
					email: data.email,
					mode: 'set_password',
					next,
				})
				setFormState(prev => ({ ...prev, success: true }))
				router.replace(`/login/verify?${params.toString()}`)
			} catch (err: any) {
				const msg = getUserMessage(err, 'login')
				setFormState(prev => ({ ...prev, error: msg, success: false }))
				triggerShake()
			} finally {
				setFormState(prev => ({ ...prev, busy: false }))
			}
		},
		[next, router, triggerShake]
	)

	const onError = useCallback(() => {
		triggerShake()
	}, [triggerShake])

	return (
		<main className={styles.page}>
			<MemoizedFireflies />
			<MemoizedStars />

			<div className={styles.container}>
				<section className={styles.card} aria-labelledby='forgot-title'>
					<header className={styles.header}>
						<h1 id='forgot-title' className={styles.title}>
							Сброс пароля
						</h1>
					</header>

					<p className={styles.notice} role='status'>
						Введите email, к которому привязан аккаунт. Если он существует, мы
						отправим код для сброса пароля.
					</p>

					<form
						onSubmit={handleSubmit(onSubmit, onError)}
						className={`${styles.form} ${formState.shake ? styles.isShaking : ''}`}
						onAnimationEnd={() =>
							formState.shake &&
							setFormState(prev => ({ ...prev, shake: false }))
						}
						noValidate
						autoComplete='on'
						aria-describedby={formState.error ? 'forgot-error' : undefined}
					>
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
							{errors.email?.message && (
								<p className={styles.errorText}>{errors.email.message}</p>
							)}
						</div>

						<button
							type='submit'
							className={`${styles.button} ${
								formState.busy || isSubmitting ? styles.loading : ''
							}`}
							disabled={!isValid || isSubmitting || formState.busy}
						>
							{formState.busy || isSubmitting
								? 'Отправляем код'
								: 'ОТПРАВИТЬ КОД'}
						</button>

						{formState.error && (
							<p id='forgot-error' className={styles.error} role='alert'>
								{formState.error}
							</p>
						)}
					</form>

					<p className={styles.swap}>
						Вспомнили пароль?{' '}
						<Link
							href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
							className={styles.link}
						>
							Войти
						</Link>
					</p>
				</section>
			</div>
		</main>
	)
}
