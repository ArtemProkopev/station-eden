// apps/web/src/lib/api.ts
import { getCsrfToken } from './csrf'

const API = process.env.NEXT_PUBLIC_API_BASE || 'https://api.stationeden.ru'
const CSRF_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || 'se_csrf'

// Гарантируем наличие CSRF-куки и по возможности берём токен из ответа
async function ensureCsrf() {
	const res = await fetch(`${API}/auth/csrf`, {
		method: 'GET',
		credentials: 'include',
	})
	// ответ может содержать { csrf: "<token>" } — не обязателен
	try {
		await res.json()
	} catch {}
}

async function postJSON(path: string, body?: any) {
	await ensureCsrf()
	const token = getCsrfToken(CSRF_NAME)
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
	if (!res.ok) {
		throw new Error(data?.message || `HTTP ${res.status}`)
	}
	return data
}

async function getJSON(path: string) {
	const res = await fetch(`${API}${path}`, {
		method: 'GET',
		credentials: 'include',
	})
	const data = await res.json().catch(() => ({}))
	if (!res.ok) {
		throw new Error(data?.message || `HTTP ${res.status}`)
	}
	return data
}

export const api = {
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
}
