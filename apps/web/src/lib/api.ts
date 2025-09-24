// apps/web/src/lib/api.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ (распаковка { ok, data })
import { getCsrfToken } from './csrf'

const API = process.env.NEXT_PUBLIC_API_BASE || 'https://api.stationeden.ru'
const CSRF_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || 'se_csrf'

/** Унифицированная распаковка ответов: если есть оболочка { ok, data }, возвращаем data */
function unwrap<T = any>(resp: any): T {
	if (resp && typeof resp === 'object' && 'data' in resp) {
		return (resp as any).data as T
	}
	return resp as T
}

async function ensureCsrfToken(): Promise<string> {
	console.log('[CSRF] ensureCsrfToken started')

	// Запрос чтобы установить куку и получить токен
	const response = await fetch(`${API}/auth/csrf`, {
		method: 'GET',
		credentials: 'include',
		cache: 'no-store',
	})

	console.log('[CSRF] Response status:', response.status)

	// Дадим браузеру время записать куку
	await new Promise(r => setTimeout(r, 100))
	const tokenFromCookie = getCsrfToken(CSRF_NAME)

	if (tokenFromCookie) {
		console.log('[CSRF] Using token from cookie')
		return tokenFromCookie
	}

	// Если кука не установилась, читаем токен из тела ответа
	try {
		const data = await response.json()
		console.log('[CSRF] Full response data:', data)

		// Сервер оборачивает в { ok, data }, где data = { csrf }
		const tokenFromBody = data?.data?.csrf

		if (tokenFromBody && typeof tokenFromBody === 'string') {
			console.log(
				'[CSRF] Using token from response body:',
				tokenFromBody.substring(0, 8) + '...'
			)
			return tokenFromBody
		} else {
			console.error('[CSRF] Token not found in response structure')
			console.error('[CSRF] Expected path: data.data.csrf')
			console.error('[CSRF] Actual data:', data)
		}
	} catch (e) {
		console.error('[CSRF] JSON parse error:', e)
	}

	throw new Error('CSRF token not available')
}

async function postJSON<T = any>(path: string, body?: unknown): Promise<T> {
	console.log(`[API] POST ${path}`)

	const token = await ensureCsrfToken()
	console.log(`[API] CSRF Token: ${token.substring(0, 8)}...`)

	const res = await fetch(`${API}${path}`, {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRF-Token': token,
		},
		body: body ? JSON.stringify(body) : undefined,
	})

	console.log(`[API] Response status: ${res.status}`)

	if (!res.ok) {
		const errorText = await res.text()
		console.error(`[API] Error: ${errorText}`)
		throw new Error(errorText || `HTTP ${res.status}`)
	}

	const responseData = await res.json()
	console.log('[API] Response data:', responseData)
	return unwrap<T>(responseData)
}

async function getJSON<T = any>(path: string): Promise<T> {
	console.log(`[API] GET ${path}`)
	const res = await fetch(`${API}${path}`, {
		method: 'GET',
		credentials: 'include',
		cache: 'no-store',
	})

	console.log(`[API] Response status: ${res.status}`)

	if (!res.ok) {
		const errorText = await res.text()
		console.error(`[API] Error: ${errorText}`)
		throw new Error(errorText || `HTTP ${res.status}`)
	}

	const responseData = await res.json()
	console.log('[API] Response data:', responseData)
	return unwrap<T>(responseData)
}

async function deleteJSON<T = any>(path: string): Promise<T> {
	console.log(`[API] DELETE ${path}`)

	const token = await ensureCsrfToken()
	console.log(`[API] CSRF Token: ${token.substring(0, 8)}...`)

	const res = await fetch(`${API}${path}`, {
		method: 'DELETE',
		credentials: 'include',
		headers: { 'X-CSRF-Token': token },
	})

	console.log(`[API] Response status: ${res.status}`)

	if (!res.ok) {
		const errorText = await res.text()
		console.error(`[API] Error: ${errorText}`)
		throw new Error(errorText || `HTTP ${res.status}`)
	}

	const responseData = await res.json()
	console.log('[API] Response data:', responseData)
	return unwrap<T>(responseData)
}

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
