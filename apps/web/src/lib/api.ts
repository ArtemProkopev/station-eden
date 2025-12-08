// apps/web/src/lib/api.ts
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

function hasCookie(name: string): boolean {
	if (typeof document === 'undefined') return false
	return document.cookie.split(';').some(c => c.trim().startsWith(`${name}=`))
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

async function throwHttpAsApiError(
	res: Response,
	context: ErrorContext
): Promise<never> {
	const contentType = res.headers.get('content-type') || ''
	const raw = await res.text().catch(() => '')
	const json =
		contentType.includes('application/json') || contentType.includes('json')
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
		payload: json,
	})
}

// Хранилище для флага принудительного логаута
function isForcedLogout(): boolean {
	if (typeof window === 'undefined') return false
	return !!(window as any).__FORCED_LOGOUT__
}

let _isRefreshing = false
async function tryRefreshOnce(): Promise<boolean> {
	// Если был принудительный логаут — никогда больше не рефрешим
	if (isForcedLogout()) {
		return false
	}

	if (_isRefreshing) return false
	if (!hasCookie('refresh_token')) return false
	_isRefreshing = true
	try {
		await api.refresh()
		return true
	} catch {
		return false
	} finally {
		_isRefreshing = false
	}
}

async function fetchWithRetry(
	input: RequestInfo | URL,
	init: RequestInit,
	context: ErrorContext,
	isRefreshCall = false,
	skipRetry = false
): Promise<Response> {
	const res = await fetch(input, init)

	// Если это запрос на logout и статус не 200, не пытаемся ретраить
	if (typeof input === 'string' && input.includes('/auth/logout') && !res.ok) {
		// Для logout мы не хотим ретраить даже если skipRetry=false
		return res
	}

	if (res.ok) return res

	// Авто-ретрай при 401 только если:
	// - это НЕ refresh запрос
	// - НЕ принудительный логаут
	// - НЕ просили пропустить ретрай
	if (res.status === 401 && !isRefreshCall && !skipRetry && !isForcedLogout()) {
		const ok = await tryRefreshOnce()
		if (ok) {
			const retried = await fetch(input, init)
			if (retried.ok) return retried
			if (retried.status !== 401) {
				if (!retried.ok) await throwHttpAsApiError(retried, context)
			}
			return retried
		}
	}

	await throwHttpAsApiError(res, context)
	throw new Error('unreachable')
}

async function postJSON<T = any>(
	path: string,
	body?: unknown,
	context: ErrorContext = 'default',
	skipRetry = false
): Promise<T> {
	const token = await ensureCsrfToken()

	const req: RequestInit = {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRF-Token': token,
		},
		body: body ? JSON.stringify(body) : undefined,
	}

	const res = await fetchWithRetry(
		`${API}${path}`,
		req,
		context,
		path === '/auth/refresh',
		skipRetry
	)

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
	const req: RequestInit = {
		method: 'GET',
		credentials: 'include',
		cache: 'no-store',
	}

	const res = await fetchWithRetry(`${API}${path}`, req, context)

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

	const req: RequestInit = {
		method: 'DELETE',
		credentials: 'include',
		headers: { 'X-CSRF-Token': token },
	}

	const res = await fetchWithRetry(`${API}${path}`, req, context)

	if (!res.ok) {
		await throwHttpAsApiError(res, context)
	}

	const responseData = await res.json().catch(() => ({}))
	return unwrap<T>(responseData)
}

export const api = {
	// Аутентификация / MFA
	login: (login: string, password: string) =>
		postJSON<{ mfa?: string; email?: string; needSetPassword?: boolean }>(
			'/auth/login',
			{ login, password },
			'login'
		),

	register: (email: string, username: string, password: string) =>
		postJSON<{ mfa?: string; email?: string }>(
			'/auth/register',
			{ email, username, password },
			'register'
		),

	verifyEmailCode: (code: string, email?: string, newPassword?: string) =>
		postJSON(
			'/auth/verify-email-code',
			{ code, email, ...(newPassword ? { newPassword } : {}) },
			'login'
		),

	resendEmailCode: () => postJSON('/auth/resend-email-code', {}, 'login'),

	refresh: (userId?: string) =>
		postJSON('/auth/refresh', userId ? { userId } : undefined, 'default'),

	logout: () => postJSON('/auth/logout', {}, 'default', true), // skipRetry = true

	// Добавляем GET версию логаута как fallback
	logoutGet: () => getJSON('/auth/logout-get', 'default'),

	me: () => getJSON('/auth/me', 'default'),

	// Админка пользователей
	users: () => getJSON('/users', 'default'),
	userById: (id: string) =>
		getJSON(`/users/${encodeURIComponent(id)}`, 'default'),
	deleteUser: (id: string) =>
		deleteJSON(`/users/${encodeURIComponent(id)}`, 'default'),

	// Экспортируем hasCookie для использования в других модулях
	hasCookie,
}

export { getUserMessage }
