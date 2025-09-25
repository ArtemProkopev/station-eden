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

	const [code, setCode] = useState('')
	const [err, setErr] = useState<string | null>(null)
	const [ok, setOk] = useState(false)
	const [busy, setBusy] = useState(false)
	const [resending, setResending] = useState(false)
	const [resendMsg, setResendMsg] = useState<string | null>(null)

	async function onSubmit(e?: React.FormEvent) {
		e?.preventDefault()
		if (!code || code.length < 6) return
		setErr(null)
		setBusy(true)
		try {
			await api.verifyEmailCode(code, email)
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

	// Автосабмит сразу после ввода 6 цифр
	useEffect(() => {
		if (code.length === 6 && !busy) {
			onSubmit()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [code])

	return (
		<>
			<div className={styles.bg} aria-hidden />
			<div className={styles.container}>
				<div className={styles.card}>
					<h1 className={styles.title}>Подтверждение входа</h1>
					<p className={styles.signupText}>
						Мы отправили 6-значный код на <b>{email}</b>.
					</p>

					<form onSubmit={onSubmit} className={styles.form}>
						<div className={styles.inputGroup}>
							<label htmlFor='code' className={styles.label}>
								Код из письма
							</label>

							{/* Новый красивый OTP-инпут */}
							<OTPInput
								id='code'
								name='code'
								length={6}
								value={code}
								onChange={v => {
									// сохраняем только цифры
									setCode(v.replace(/\D/g, '').slice(0, 6))
									if (err) setErr(null)
								}}
								onComplete={v => {
									setCode(v)
									// можно сразу отправлять, но оставим это в useEffect
								}}
								autoFocus
								disabled={busy}
								error={!!err}
								ariaLabel='Код подтверждения из письма'
								className={
									styles.input /* чтобы не ломать вертикальные отступы */
								}
							/>
						</div>

						<button
							type='submit'
							className={styles.button}
							disabled={busy || code.length < 6}
						>
							{busy ? 'Проверяем…' : 'ПОДТВЕРДИТЬ'}
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
