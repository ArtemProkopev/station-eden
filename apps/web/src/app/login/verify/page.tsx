'use client'

import OTPInput from '@/src/components/ui/OTPInput'
import { api } from '@/src/lib/api'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from '../page.module.css'

export default function VerifyEmailCodePage() {
	const router = useRouter()
	const sp = useSearchParams()
	const email = sp.get('email') || ''
	const next = sp.get('next') || '/profile'
	const mode = sp.get('mode') // 'set_password' | null

	const [code, setCode] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [show, setShow] = useState(false)

	const [err, setErr] = useState<string | null>(null)
	const [ok, setOk] = useState(false)
	const [busy, setBusy] = useState(false)
	const [resending, setResending] = useState(false)
	const [resendMsg, setResendMsg] = useState<string | null>(null)

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
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new Event('session-changed'))
			}
			router.replace(next)
		} catch (e: any) {
			setErr(e?.message || 'Неверный или просроченный код')
		} finally {
			setBusy(false)
		}
	}

	async function onSubmit(e?: React.FormEvent) {
		e?.preventDefault()
		if (!code || code.length < 6) return
		if (mode === 'set_password' && newPassword.length < 8) {
			setErr('Пароль должен быть не короче 8 символов')
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

	// Автосабмит сразу после ввода 6 цифр (если не требуется пароль)
	useEffect(() => {
		if (code.length === 6 && !busy && mode !== 'set_password') {
			onSubmit()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [code, mode])

	return (
		<>
			<div className={styles.bg} aria-hidden />
			<div className={styles.container}>
				<div className={styles.card}>
					<h1 className={styles.title}>
						{mode === 'set_password'
							? 'Подтвердите email и задайте пароль'
							: 'Подтверждение входа'}
					</h1>

					<p className={styles.signupText}>
						Мы отправили 6-значный код на <b>{email}</b>.
					</p>

					<form onSubmit={onSubmit} className={styles.form}>
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
								onComplete={v => {
									setCode(v)
								}}
								autoFocus
								disabled={busy}
								error={!!err}
								ariaLabel='Код подтверждения из письма'
								className={styles.input}
							/>
						</div>

						{mode === 'set_password' && (
							<div className={styles.inputGroup}>
								<label htmlFor='newPassword' className={styles.label}>
									Новый пароль
								</label>
								<div className={styles.inputWrap}>
									<input
										id='newPassword'
										required
										type={show ? 'text' : 'password'}
										autoComplete='new-password'
										minLength={8}
										placeholder='Придумайте пароль (≥8)'
										value={newPassword}
										onChange={e => setNewPassword(e.target.value)}
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
										{/* простая иконка — можно переиспользовать из страницы логина */}
										<svg
											viewBox='0 0 24 24'
											aria-hidden='true'
											fill='none'
											stroke='currentColor'
											strokeWidth='2.5'
											strokeLinecap='round'
											strokeLinejoin='round'
											width='20'
											height='20'
										>
											<path d='M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z' />
											<circle cx='12' cy='12' r='3' />
										</svg>
									</button>
								</div>
							</div>
						)}

						<button
							type='submit'
							className={styles.button}
							disabled={
								busy ||
								code.length < 6 ||
								(mode === 'set_password' && newPassword.length < 8)
							}
						>
							{busy
								? 'Проверяем…'
								: mode === 'set_password'
									? 'ПОДТВЕРДИТЬ И СОХРАНИТЬ ПАРОЛЬ'
									: 'ПОДТВЕРДИТЬ'}
						</button>
					</form>

					{err && <p className={styles.error}>{err}</p>}
					{ok && <p className={styles.ok}>Готово!</p>}
					{resendMsg && <p className={styles.ok}>{resendMsg}</p>}

					<p className={styles.signupText} style={{ marginTop: 12 }}>
						Не пришло письмо?{' '}
						<button
							type='button'
							onClick={onResend}
							disabled={resending}
							className={styles.link}
							style={{
								background: 'transparent',
								border: 0,
								padding: 0,
								cursor: 'pointer',
							}}
						>
							{resending ? 'Отправляем…' : 'Отправить код ещё раз'}
						</button>
					</p>

					<p className={styles.signupText} style={{ marginTop: 6 }}>
						Если что — проверьте «Спам» или попробуйте войти заново.
					</p>
				</div>
			</div>
		</>
	)
}
