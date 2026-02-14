// apps/web/src/lib/api.ts
import { isForcedLogout } from './authUtils'
import { getCsrfToken } from './csrf'
import {
	ApiError,
	ErrorContext,
	getUserMessage,
	mapToUserMessage,
} from './errors'

function isRecord(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v)
}

function resolveApiBase() {
	if (typeof window !== 'undefined') return '/api'

	const fromEnv = (process.env.NEXT_PUBLIC_API_BASE || '').trim()
	if (fromEnv) return fromEnv.replace(/\/+$/, '')
	return 'http://localhost:4000'
}

const API = resolveApiBase()
const CSRF_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || 'se_csrf'

function unwrap<T = unknown>(resp: unknown): T {
	if (isRecord(resp) && 'data' in resp) {
		return (resp.data as T) ?? (resp as T)
	}
	return resp as T
}

async function safeJson(text: string | null): Promise<unknown | undefined> {
	if (!text) return undefined
	try {
		return JSON.parse(text) as unknown
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

	await new Promise<void>(r => setTimeout(r, 80))

	const tokenFromCookie = getCsrfToken(CSRF_NAME)
	if (tokenFromCookie) return tokenFromCookie

	try {
		const data = (await response.json().catch(() => undefined)) as unknown
		if (isRecord(data)) {
			const csrfFromData =
				isRecord(data.data) && typeof data.data.csrf === 'string'
					? data.data.csrf
					: typeof data.csrf === 'string'
						? data.csrf
						: undefined
			if (typeof csrfFromData === 'string' && csrfFromData) return csrfFromData
		}
	} catch {
		// ignore
	}

	throw new Error('CSRF token not available')
}

function pickServerMessage(json: unknown, raw: string): string | undefined {
	if (isRecord(json)) {
		const msg = json.message
		if (Array.isArray(msg) && typeof msg[0] === 'string') return msg[0]
		if (typeof msg === 'string') return msg
		if (typeof json.error === 'string') return json.error
		if (typeof json.detail === 'string') return json.detail
	}
	if (typeof json === 'string') return json
	return raw && !json ? raw : undefined
}

async function throwHttpAsApiError(
	res: Response,
	context: ErrorContext,
): Promise<never> {
	const contentType = res.headers.get('content-type') || ''
	const raw = await res.text().catch(() => '')
	const json =
		contentType.includes('application/json') || contentType.includes('json')
			? await safeJson(raw)
			: await safeJson(raw)

	const serverMessage = pickServerMessage(json, raw)

	const code =
		isRecord(json) && typeof json.code === 'string' ? json.code : undefined

	const userMessage = mapToUserMessage(
		res.status,
		String(serverMessage ?? ''),
		context,
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

let _isRefreshing = false

async function tryRefreshOnce(): Promise<boolean> {
	if (isForcedLogout()) return false
	if (_isRefreshing) return false

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
	skipRetry = false,
): Promise<Response> {
	const res = await fetch(input, init)

	if (typeof input === 'string' && input.includes('/auth/logout') && !res.ok) {
		return res
	}

	if (res.ok) return res

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

async function postJSON<T = unknown>(
	path: string,
	body?: unknown,
	context: ErrorContext = 'default',
	skipRetry = false,
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
		skipRetry,
	)

	const responseData = await res.json().catch(() => ({}))
	return unwrap<T>(responseData)
}

async function putJSON<T = unknown>(
	path: string,
	body?: unknown,
	context: ErrorContext = 'default',
	skipRetry = false,
): Promise<T> {
	const token = await ensureCsrfToken()

	const req: RequestInit = {
		method: 'PUT',
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
		false,
		skipRetry,
	)

	const responseData = await res.json().catch(() => ({}))
	return unwrap<T>(responseData)
}

async function getJSON<T = unknown>(
	path: string,
	context: ErrorContext = 'default',
): Promise<T> {
	const req: RequestInit = {
		method: 'GET',
		credentials: 'include',
		cache: 'no-store',
	}

	const res = await fetchWithRetry(`${API}${path}`, req, context)
	const responseData = await res.json().catch(() => ({}))
	return unwrap<T>(responseData)
}

async function deleteJSON<T = unknown>(
	path: string,
	context: ErrorContext = 'default',
): Promise<T> {
	const token = await ensureCsrfToken()

	const req: RequestInit = {
		method: 'DELETE',
		credentials: 'include',
		headers: { 'X-CSRF-Token': token },
	}

	const res = await fetchWithRetry(`${API}${path}`, req, context)
	const responseData = await res.json().catch(() => ({}))
	return unwrap<T>(responseData)
}

export const api = {
	login: (login: string, password: string) =>
		postJSON<{ mfa?: string; email?: string; needSetPassword?: boolean }>(
			'/auth/login',
			{ login, password },
			'login',
			true,
		),

	register: (email: string, username: string, password: string) =>
		postJSON<{ mfa?: string; email?: string }>(
			'/auth/register',
			{ email, username, password },
			'register',
			true,
		),

	verifyEmailCode: (code: string, email?: string, newPassword?: string) =>
		postJSON(
			'/auth/verify-email-code',
			{ code, email, ...(newPassword ? { newPassword } : {}) },
			'login',
			true,
		),

	resendEmailCode: () => postJSON('/auth/resend-email-code', {}, 'login', true),

	forgotPassword: (email: string) =>
		postJSON<{ mfa?: string; email?: string }>(
			'/auth/forgot-password',
			{ email },
			'login',
			true,
		),

	refresh: (userId?: string) =>
		postJSON('/auth/refresh', userId ? { userId } : undefined, 'default'),

	logout: () => postJSON('/auth/logout', {}, 'default', true),

	logoutGet: () => getJSON('/auth/logout-get', 'default'),

	me: () => getJSON('/auth/me', 'default'),

	session: () => getJSON('/auth/session', 'default'),

	updateProfile: (patch: {
		avatar?: string
		frame?: string
		username?: string
	}) =>
		putJSON<{
			ok: true
			avatar: string | null
			frame: string | null
			username: string | null
			usernameChangedAt?: string | null
		}>('/users/profile', patch, 'default'),

	users: () => getJSON('/users', 'default'),
	userById: (id: string) =>
		getJSON(`/users/${encodeURIComponent(id)}`, 'default'),
	deleteUser: (id: string) =>
		deleteJSON(`/users/${encodeURIComponent(id)}`, 'default'),

	hasCookie,
}

export { getUserMessage }
