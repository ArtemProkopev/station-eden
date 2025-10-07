// apps/web/src/lib/api.ts - обновлено: login(login), register(email, username, password)
import { getCsrfToken } from './csrf'
import {
	ApiError,
	ErrorContext,
	getUserMessage,
	mapToUserMessage,
} from './errors'

const API = process.env.NEXT_PUBLIC_API_BASE || 'https://api.stationeden.ru'
const CSRF_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || 'se_csrf'

function unwrap<T = any>(resp: any): T {
	if (resp && typeof resp === 'object' && 'data' in resp) {
		return (resp as any).data as T
	}
	return resp as T
}

async function safeJson(text: string | null): Promise<any | undefined> {
	if (!text) return undefined
	try {
		return JSON.parse(text)
	} catch {
		return undefined
	}
}

async function ensureCsrfToken(): Promise<string> {
	const response = await fetch(`${API}/auth/csrf`, {
		method: 'GET',
		credentials: 'include',
		cache: 'no-store',
	})
	await new Promise(r => setTimeout(r, 100))
	const tokenFromCookie = getCsrfToken(CSRF_NAME)
	if (tokenFromCookie) return tokenFromCookie
	try {
		const data = (await response.json().catch(() => undefined)) as any
		const tokenFromBody = data?.data?.csrf ?? data?.csrf
		if (typeof tokenFromBody === 'string' && tokenFromBody) return tokenFromBody
	} catch {}
	throw new Error('CSRF token not available')
}

async function throwHttpAsApiError(res: Response, context: ErrorContext) {
	const contentType = res.headers.get('content-type') || ''
	const raw = await res.text().catch(() => '')
	const json = contentType.includes('application/json')
		? await safeJson(raw)
		: await safeJson(raw)

	const serverMessage =
		(Array.isArray(json?.message) ? json?.message?.[0] : json?.message) ??
		json?.error ??
		json?.detail ??
		(typeof json === 'string' ? json : undefined) ??
		(raw && !json ? raw : undefined)

	const code = json?.code
	const userMessage = mapToUserMessage(
		res.status,
		String(serverMessage ?? ''),
		context
	)

	throw new ApiError({
		status: res.status,
		code,
		serverMessage:
			typeof serverMessage === 'string' ? serverMessage : undefined,
		userMessage,
	})
}

async function postJSON<T = any>(
	path: string,
	body?: unknown,
	context: ErrorContext = 'default'
): Promise<T> {
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

	if (!res.ok) {
		await throwHttpAsApiError(res, context)
	}

	const responseData = await res.json().catch(() => ({}))
	return unwrap<T>(responseData)
}

async function getJSON<T = any>(
	path: string,
	context: ErrorContext = 'default'
): Promise<T> {
	const res = await fetch(`${API}${path}`, {
		method: 'GET',
		credentials: 'include',
		cache: 'no-store',
	})

	if (!res.ok) {
		await throwHttpAsApiError(res, context)
	}

	const responseData = await res.json().catch(() => ({}))
	return unwrap<T>(responseData)
}

async function deleteJSON<T = any>(
	path: string,
	context: ErrorContext = 'default'
): Promise<T> {
	const token = await ensureCsrfToken()

	const res = await fetch(`${API}${path}`, {
		method: 'DELETE',
		credentials: 'include',
		headers: { 'X-CSRF-Token': token },
	})

	if (!res.ok) {
		await throwHttpAsApiError(res, context)
	}

	const responseData = await res.json().catch(() => ({}))
	return unwrap<T>(responseData)
}

export const api = {
	// Аутентификация / MFA
	// login: теперь принимает login (email или username)
	login: (login: string, password: string) =>
		postJSON<{ mfa?: string; email?: string; needSetPassword?: boolean }>(
			'/auth/login',
			{ login, password },
			'login'
		),

	// register: добавить username
	register: (email: string, username: string, password: string) =>
		postJSON<{ mfa?: string; email?: string }>(
			'/auth/register',
			{ email, username, password },
			'register'
		),

	// ⬇️ verifyEmailCode(newPassword?) без изменений
	verifyEmailCode: (code: string, email?: string, newPassword?: string) =>
		postJSON(
			'/auth/verify-email-code',
			{ code, email, ...(newPassword ? { newPassword } : {}) },
			'login'
		),

	resendEmailCode: () => postJSON('/auth/resend-email-code', {}, 'login'),

	refresh: (userId?: string) =>
		postJSON('/auth/refresh', userId ? { userId } : undefined, 'default'),

	logout: () => postJSON('/auth/logout', {}, 'default'),

	me: () => getJSON('/auth/me', 'default'),

	// Админка пользователей
	users: () => getJSON('/users', 'default'),
	userById: (id: string) =>
		getJSON(`/users/${encodeURIComponent(id)}`, 'default'),
	deleteUser: (id: string) =>
		deleteJSON(`/users/${encodeURIComponent(id)}`, 'default'),
}

export { getUserMessage }
