// apps/web/src/lib/api.ts
import { getCsrfToken } from './csrf'

const API = process.env.NEXT_PUBLIC_API_BASE || 'https://api.stationeden.ru'
const CSRF_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || 'se_csrf'

// ===== ВНУТРЕННИЕ УТИЛИТЫ =====

/** Пингуем /auth/csrf, чтобы сервер выдал/продлил CSRF-куку */
async function touchCsrf(): Promise<void> {
	await fetch(`${API}/auth/csrf`, {
		method: 'GET',
		credentials: 'include',
	}).catch(() => {})
}

/** Иногда браузер не сразу «видит» новую куку. Делаем короткий ретрай. */
async function readCsrfWithRetry(
	name = CSRF_NAME,
	tries = 4,
	delayMs = 50
): Promise<string | null> {
	for (let i = 0; i < tries; i++) {
		const v = getCsrfToken(name)
		if (v && v.length > 0) return v
		await new Promise(r => setTimeout(r, delayMs))
	}
	return null
}

async function ensureCsrfToken(): Promise<string> {
	// 1) пробуем сразу
	let token = getCsrfToken(CSRF_NAME)
	if (token) return token

	// 2) дергаем /auth/csrf и читаем снова с ретраем
	await touchCsrf()
	token = await readCsrfWithRetry(CSRF_NAME)
	if (!token) {
		throw new Error('CSRF token not available')
	}
	return token
}

async function postJSON<T = any>(path: string, body?: unknown): Promise<T> {
	const token = await ensureCsrfToken()
	const res = await fetch(`${API}${path}`, {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRF-Token': token,
		},
		body: body ? JSON.stringify(body) : undefined,
	})
	const data = await res.json().catch(() => ({}))
	if (!res.ok) throw new Error((data as any)?.message || `HTTP ${res.status}`)
	return data as T
}

async function deleteJSON<T = any>(path: string): Promise<T> {
	const token = await ensureCsrfToken()
	const res = await fetch(`${API}${path}`, {
		method: 'DELETE',
		credentials: 'include',
		headers: {
			'X-CSRF-Token': token,
		},
	})
	const data = await res.json().catch(() => ({}))
	if (!res.ok) throw new Error((data as any)?.message || `HTTP ${res.status}`)
	return data as T
}

async function getJSON<T = any>(path: string): Promise<T> {
	const res = await fetch(`${API}${path}`, {
		method: 'GET',
		credentials: 'include',
	})
	const data = await res.json().catch(() => ({}))
	if (!res.ok) throw new Error((data as any)?.message || `HTTP ${res.status}`)
	return data as T
}

// ===== ПУБЛИЧНОЕ API ДЛЯ СТРАНИЦ =====

export const api = {
	// Аутентификация / MFA
	login: (email: string, password: string) =>
		postJSON('/auth/login', { email, password }),
	register: (email: string, password: string) =>
		postJSON('/auth/register', { email, password }),
	verifyEmailCode: (code: string, email?: string) =>
		postJSON('/auth/verify-email-code', { code, email }),
	resendEmailCode: () => postJSON('/auth/resend-email-code'),
	refresh: (userId?: string) =>
		postJSON('/auth/refresh', userId ? { userId } : undefined),
	logout: () => postJSON('/auth/logout', {}),
	me: () => getJSON('/auth/me'),

	// Админка пользователей
	users: () => getJSON('/users'),
	userById: (id: string) => getJSON(`/users/${encodeURIComponent(id)}`),
	deleteUser: (id: string) => deleteJSON(`/users/${encodeURIComponent(id)}`),
}
