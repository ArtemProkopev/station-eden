'use client'

import OTPInput from '@/src/components/ui/OTPInput'
import { api } from '@/src/lib/api'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, memo } from 'react'
import styles from './page.module.css'
import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile'
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars'

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

export default function VerifyEmailCodePage() {
	const router = useRouter()
	const sp = useSearchParams()

	const email = sp.get('email') || ''
	const next = sp.get('next') || '/profile'
	const mode = sp.get('mode')

	const [code, setCode] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [show, setShow] = useState(false)

	const [err, setErr] = useState<string | null>(null)
	const [ok, setOk] = useState(false)
	const [busy, setBusy] = useState(false)
	const [resending, setResending] = useState(false)
	const [resendMsg, setResendMsg] = useState<string | null>(null)
	const [shake, setShake] = useState(false)

	const canSubmit = useMemo(() => {
		if (busy) return false
		if (mode === 'set_password')
			return code.length === 6 && newPassword.length >= 8
		return code.length === 6
	}, [busy, mode, code.length, newPassword.length])

	async function doVerify() {
		setErr(null)
		setBusy(true)
		try {
			await api.verifyEmailCode(
				code,
				email,
				mode === 'set_password' ? newPassword : undefined
			)
			try {
				await api.me()
			} catch {}
			setOk(true)
			if (typeof window !== 'undefined')
				window.dispatchEvent(new Event('session-changed'))
			router.replace(next)
		} catch (e: any) {
			setErr(e?.message || 'Неверный или просроченный код')
			setShake(true)
			setTimeout(() => setShake(false), 340)
		} finally {
			setBusy(false)
		}
	}

	async function onSubmit(e?: React.FormEvent) {
		e?.preventDefault()
		if (!canSubmit) {
			setShake(true)
			setTimeout(() => setShake(false), 340)
			return
		}
		await doVerify()
	}

	async function onResend() {
		setResendMsg(null)
		setErr(null)
		setResending(true)
		try {
			await api.resendEmailCode()
			setResendMsg('Письмо отправлено повторно. Проверьте «Входящие» и «Спам».')
		} catch (e: any) {
			setErr(e?.message || 'Не удалось отправить письмо повторно')
		} finally {
			setResending(false)
		}
	}

	useEffect(() => {
		if (code.length === 6 && !busy && mode !== 'set_password') {
			onSubmit()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [code, mode])

	const title =
		mode === 'set_password'
			? 'Подтвердите email и задайте пароль'
			: 'Подтверждение входа'

	return (
		<>
			<div className={styles.bg} aria-hidden />
				<MemoizedFireflies />
				<MemoizedStars />
			<main className={styles.container}>
				<section className={styles.card} aria-labelledby='verify-title'>
					<header>
						<h1 id='verify-title' className={styles.title}>
							{title}
						</h1>
					</header>

					<p className={styles.lead} id='lead'>
						Мы отправили 6-значный код на <b>{email}</b>.
					</p>

					<form
						onSubmit={onSubmit}
						className={`${styles.form} ${shake ? styles.isShaking : ''}`}
						onAnimationEnd={() => shake && setShake(false)}
						noValidate
						aria-describedby={
							err
								? 'verify-error'
								: resendMsg
									? 'verify-resend'
									: ok
										? 'verify-ok'
										: 'lead'
						}
					>
						<fieldset className={styles.fieldset}>
							<legend className='sr-only'>Подтверждение кода</legend>

							<div className={styles.inputGroup}>
								<label htmlFor='code' className={styles.label}>
									Код из письма
								</label>

									<OTPInput
										id='code'
										name='code'
										length={6}
										value={code}
										onChange={v => {
											setCode(v.replace(/\D/g, '').slice(0, 6))
											if (err) setErr(null)
										}}
										onComplete={v => setCode(v)}
										autoFocus
										disabled={busy}
										error={!!err}
										ariaLabel='Код подтверждения из письма'
										className={styles.otp}
									/>
							</div>
						</fieldset>

						{mode === 'set_password' && (
							<fieldset className={styles.fieldset}>
								<legend className='sr-only'>Установка нового пароля</legend>

								<div className={styles.inputGroup}>
									<label htmlFor='newPassword' className={styles.label}>
										Новый пароль
									</label>

									<div className={styles.inputWrap}>
										<input
											id='newPassword'
											name='new-password'
											required
											type={show ? 'text' : 'password'}
											autoComplete='new-password'
											minLength={8}
											placeholder='Придумайте пароль (≥8)'
											value={newPassword}
											onChange={e => setNewPassword(e.target.value)}
											className={styles.input}
											aria-invalid={
												newPassword.length > 0
													? newPassword.length < 8
													: undefined
											}
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

									<p id='pw-hint' className={styles.pwHint}>
										Минимум 8 символов. Лучше сочетать буквы, цифры и
										спецсимволы.
									</p>
								</div>
							</fieldset>
						)}

						<button
							type='submit'
							className={`${styles.button} ${busy ? styles.loading : ''}`}
							disabled={!canSubmit}
							aria-disabled={!canSubmit}
						>
							{busy
								? 'Проверяем'
								: mode === 'set_password'
									? 'ПОДТВЕРДИТЬ И СОХРАНИТЬ ПАРОЛЬ'
									: 'ПОДТВЕРДИТЬ'}
						</button>

						{err && (
							<p id='verify-error' className={styles.error} role='alert'>
								{err}
							</p>
						)}
						{ok && (
							<p
								id='verify-ok'
								className={styles.ok}
								role='status'
								aria-live='polite'
							>
								Готово!
							</p>
						)}
						{resendMsg && (
							<p
								id='verify-resend'
								className={styles.ok}
								role='status'
								aria-live='polite'
							>
								{resendMsg}
							</p>
						)}
					</form>

					<p className={styles.helper}>
						Не пришло письмо?{' '}
						<button
							type='button'
							onClick={onResend}
							disabled={resending}
							className={styles.linkButton}
						>
							{resending ? 'Отправляем…' : 'Отправить код ещё раз'}
						</button>
					</p>

					<p className={styles.helper}>
						Если что — проверьте «Спам» или попробуйте войти заново.
					</p>
				</section>
			</main>
		</>
	)
}
