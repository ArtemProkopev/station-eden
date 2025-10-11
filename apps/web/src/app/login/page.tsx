'use client'

import GoogleAuthButton from '@/src/components/auth/GoogleAuthButton'
import { api, getUserMessage } from '@/src/lib/api'
import { GOOGLE_ENABLED } from '@/src/lib/flags'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
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

/** Часы для бейджа блокировки (минимал) */
function ClockIcon() {
	return (
		<svg
			viewBox='0 0 24 24'
			aria-hidden='true'
			width='16'
			height='16'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
			focusable='false'
		>
			<circle cx='12' cy='12' r='9' />
			<path d='M12 7v5l3 2' />
		</svg>
	)
}

function formatRemaining(ms: number) {
	if (ms <= 0) return '0:00'
	const sec = Math.ceil(ms / 1000)
	const m = Math.floor(sec / 60)
	const s = sec % 60
	return `${m}:${s.toString().padStart(2, '0')}`
}

const MAX_ATTEMPTS_UI = 5

// ===== LocalStorage helpers (персистентная блокировка) =====
const LOCK_KEY = 'se_auth_lock' as const
type LockPayload = { login: string; lockedUntilIso: string }
const normLogin = (s: string) => s.trim().toLowerCase()

function readLock(): LockPayload | null {
	try {
		const raw = localStorage.getItem(LOCK_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw) as LockPayload
		if (!parsed?.lockedUntilIso) return null
		return parsed
	} catch {
		return null
	}
}
function writeLock(login: string, lockedUntilIso: string) {
	try {
		localStorage.setItem(
			LOCK_KEY,
			JSON.stringify({ login: normLogin(login), lockedUntilIso })
		)
	} catch {}
}
function clearLock() {
	try {
		localStorage.removeItem(LOCK_KEY)
	} catch {}
}

// ===== Разбор ответа бэка/ошибки =====
function parseServerInfo(err: any) {
	const text =
		(err &&
			(err.message ||
				err.error ||
				err.response?.data?.message ||
				err.response?.data ||
				err.response?.data?.error)) ||
		(err && JSON.stringify(err)) ||
		''
	const t = String(text)

	const lockMinutesMatch = t.match(/locked for\s+(\d+)\s+minutes/i)
	if (lockMinutesMatch) {
		const num = Number(lockMinutesMatch[1])
		if (!Number.isNaN(num)) return { lockedMinutes: num }
	}

	const untilIsoMatch =
		t.match(/blocked until\s+([\d\-\wT:.Z]+)/i) ||
		t.match(/locked until\s+([\d\-\wT:.Z]+)/i)
	if (untilIsoMatch) {
		const parsed = Date.parse(untilIsoMatch[1])
		if (!Number.isNaN(parsed))
			return { lockedUntil: new Date(parsed).toISOString() }
	}

	const attemptsMatch =
		t.match(/Attempts left[:\s]*([0-9]+)/i) ||
		t.match(/attempts left[:\s]*([0-9]+)/i)
	if (attemptsMatch) return { attemptsLeft: Number(attemptsMatch[1]) }

	const data = err?.payload ?? err?.response?.data
	if (data && typeof data === 'object') {
		if (typeof data.minutesLeft === 'number')
			return { lockedMinutes: data.minutesLeft }
		if (typeof data.attemptsLeft === 'number')
			return { attemptsLeft: data.attemptsLeft }
		if (typeof data.lockedUntil === 'string')
			return { lockedUntil: data.lockedUntil }
	}

	return {}
}

function LoginInner() {
	const [login, setLogin] = useState('')
	const [password, setPassword] = useState('')
	const [show, setShow] = useState(false)

	const [error, setError] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)
	const [mounted, setMounted] = useState(false)
	const [shake, setShake] = useState(false)

	const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
	const [lockedUntilIso, setLockedUntilIso] = useState<string | null>(null)
	const [countdown, setCountdown] = useState<string | null>(null)

	const router = useRouter()
	const sp = useSearchParams()
	const next = sp.get('next') || '/profile'
	const reason = sp.get('reason')

	const timerRef = useRef<number | null>(null)
	const lastLoginRef = useRef<string>('') // чтобы писать в localStorage логин, по которому пришла блокировка

	useEffect(() => setMounted(true), [])

	// восстановление из localStorage + при возврате во вкладку
	useEffect(() => {
		const applyFromStorage = () => {
			const saved = readLock()
			if (!saved) return
			const until = Date.parse(saved.lockedUntilIso)
			if (!Number.isNaN(until) && until > Date.now()) {
				setLockedUntilIso(new Date(until).toISOString())
				setAttemptsLeft(null)
				if (!lastLoginRef.current) lastLoginRef.current = saved.login
			} else {
				clearLock()
			}
		}
		applyFromStorage()
		const onVis = () => {
			if (document.visibilityState === 'visible') applyFromStorage()
		}
		document.addEventListener('visibilitychange', onVis)
		return () => document.removeEventListener('visibilitychange', onVis)
	}, [])

	// тики таймера
	useEffect(() => {
		if (!lockedUntilIso) {
			if (timerRef.current) {
				clearInterval(timerRef.current)
				timerRef.current = null
			}
			setCountdown(null)
			return
		}
		const update = () => {
			const until = Date.parse(lockedUntilIso)
			const rem = until - Date.now()
			if (rem <= 0) {
				setLockedUntilIso(null)
				setCountdown(null)
				setAttemptsLeft(null)
				clearLock()
				if (timerRef.current) {
					clearInterval(timerRef.current)
					timerRef.current = null
				}
			} else {
				setCountdown(formatRemaining(rem))
			}
		}
		update()
		timerRef.current = window.setInterval(update, 1000)
		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current)
				timerRef.current = null
			}
		}
	}, [lockedUntilIso])

	const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	const userRe = /^[a-zA-Z0-9_]{3,20}$/
	const isLoginValid = emailRe.test(login) || userRe.test(login)

	const canSubmit = useMemo(() => {
		if (busy) return false
		if (lockedUntilIso) return false
		return isLoginValid && password.length >= 8
	}, [busy, isLoginValid, password.length, lockedUntilIso])

	function handleParseAndSet(err: any) {
		const info = parseServerInfo(err)
		if (info.attemptsLeft !== undefined)
			setAttemptsLeft(Number(info.attemptsLeft))
		if (info.lockedMinutes !== undefined) {
			const until = new Date(
				Date.now() + Number(info.lockedMinutes) * 60 * 1000
			)
			const iso = until.toISOString()
			setLockedUntilIso(iso)
			writeLock(lastLoginRef.current || login || 'unknown', iso)
		}
		if (info.lockedUntil) {
			const parsed = Date.parse(info.lockedUntil)
			if (!Number.isNaN(parsed)) {
				const iso = new Date(parsed).toISOString()
				setLockedUntilIso(iso)
				writeLock(lastLoginRef.current || login || 'unknown', iso)
			}
		}
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
		lastLoginRef.current = normLogin(login)
		try {
			const res = await api.login(login, password)
			if ((res as any)?.mfa === 'email_code_sent') {
				const needSet = (res as any)?.needSetPassword === true
				const q = new URLSearchParams({
					email: (res as any)?.email || '',
					next,
					...(needSet ? { mode: 'set_password' } : {}),
				})
				clearLock()
				router.replace(`/login/verify?${q.toString()}`)
				return
			}
			clearLock()
			router.replace(next)
		} catch (err: any) {
			setError(getUserMessage(err, 'login'))
			handleParseAndSet(err)
			setShake(true)
			setTimeout(() => setShake(false), 340)
		} finally {
			setBusy(false)
		}
	}

	const googleEnabled = GOOGLE_ENABLED
	const locked = Boolean(lockedUntilIso && countdown)
	const progressPct =
		attemptsLeft == null
			? 0
			: Math.min(
					100,
					Math.round(((MAX_ATTEMPTS_UI - attemptsLeft) / MAX_ATTEMPTS_UI) * 100)
				)

	return (
		<>
			<div className={styles.bg} aria-hidden />
			<main className={styles.container}>
				<section className={styles.card} aria-labelledby='login-title'>
					<header>
						<h1 id='login-title' className={styles.title}>
							Вход
						</h1>
					</header>

					{reason === 'google_exists' && (
						<p className={`${styles.notice} ${styles.info}`} role='status'>
							Аккаунт с этим Google-email уже существует — просто войдите.
						</p>
					)}
					{reason === 'google_no_account' && (
						<p className={`${styles.notice} ${styles.info}`} role='status'>
							Похоже, такого аккаунта ещё нет. Вы можете зарегистрироваться.
						</p>
					)}

					{/* Лаконичные бейджи */}
					<div className={styles.pillRow} aria-live='polite'>
						{locked && (
							<div
								className={`${styles.pill} ${styles.pillLock}`}
								role='status'
							>
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
							<div
								className={`${styles.pill} ${styles.pillWarn}`}
								role='status'
							>
								<span className={styles.pillLabel}>
									Неверный логин или пароль
								</span>
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

					<form
						onSubmit={onSubmit}
						className={`${styles.form} ${shake ? styles.isShaking : ''}`}
						onAnimationEnd={() => shake && setShake(false)}
						noValidate
						autoComplete='on'
						aria-describedby={
							error && attemptsLeft === null && !locked
								? 'login-error'
								: undefined
						}
					>
						<div className={styles.inputGroup}>
							<label htmlFor='login' className={styles.label}>
								Email или username
							</label>
							<input
								id='login'
								name='login'
								required
								type='text'
								spellCheck={false}
								autoCorrect='off'
								autoCapitalize='none'
								autoComplete='username email'
								placeholder='Введите email или username'
								value={login}
								onChange={e => setLogin(e.target.value.trimStart())}
								className={styles.input}
								aria-invalid={
									login.length > 0
										? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login) &&
											!/^[a-zA-Z0-9_]{3,20}$/.test(login)
										: undefined
								}
								disabled={locked}
							/>
						</div>

						<div className={styles.inputGroup}>
							<label htmlFor='password' className={styles.label}>
								Пароль
							</label>
							<div className={styles.inputWrap}>
								<input
									id='password'
									name='current-password'
									required
									type={show ? 'text' : 'password'}
									autoComplete='current-password'
									minLength={8}
									placeholder='Введите пароль (≥8)'
									value={password}
									onChange={e => setPassword(e.target.value)}
									className={styles.input}
									aria-invalid={
										password.length > 0 ? password.length < 8 : undefined
									}
									disabled={locked}
								/>
								<button
									type='button'
									className={styles.toggleBtn}
									aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
									aria-pressed={show}
									onClick={() => setShow(s => !s)}
									title={show ? 'Скрыть пароль' : 'Показать пароль'}
									disabled={locked}
								>
									{show ? <EyeOffIcon /> : <EyeIcon />}
								</button>
							</div>
						</div>

						<button
							type='submit'
							className={`${styles.button} ${busy ? styles.loading : ''}`}
							disabled={!canSubmit}
							aria-disabled={!canSubmit}
						>
							{locked ? 'Заблокировано…' : busy ? 'Входим' : 'ВОЙТИ'}
						</button>

						{/* общий текст ниже только если нет пилюль */}
						{error && attemptsLeft === null && !locked && (
							<p id='login-error' className={styles.error} role='alert'>
								{error}
							</p>
						)}
					</form>

					<p className={styles.swap}>
						Нет аккаунта?{' '}
						<Link href='/register' className={styles.link}>
							Зарегистрироваться
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
								<GoogleAuthButton label='Войти с Google' mode='login' />
							</div>
						</>
					)}
				</section>
			</main>
		</>
	)
}

export default function LoginPage() {
	return (
		<Suspense
			fallback={
				<>
					<div className={styles.bg} aria-hidden />
					<main className={styles.container}>
						<section className={styles.card}>
							<h1 className={styles.title}>Вход</h1>
							<p>Loading…</p>
						</section>
					</main>
				</>
			}
		>
			<LoginInner />
		</Suspense>
	)
}
