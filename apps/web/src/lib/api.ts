// apps/web/src/lib/api.ts
import { getCsrfToken } from './csrf'

const API = process.env.NEXT_PUBLIC_API_BASE || 'https://api.stationeden.ru'
const CSRF_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || 'se_csrf'

// ===== ВНУТРЕННИЕ УТИЛИТЫ =====

/** Получаем токен напрямую из ответа /auth/csrf и параллельно ставим куку. */
async function fetchCsrfFromApi(): Promise<string | null> {
	const url = `${API}/auth/csrf?ts=${Date.now()}`
	try {
		console.log('[CSRF] Fetching token from API:', url)
		const res = await fetch(url, {
			method: 'GET',
			credentials: 'include',
			cache: 'no-store',
			headers: { Accept: 'application/json' },
		})
		
		console.log('[CSRF] API response status:', res.status)
		
		// Проверяем статус ответа
		if (!res.ok) {
			console.error('[CSRF] API response not OK:', res.status, res.statusText)
			return null
		}
		
		const data = await res.json().catch((error) => {
			console.error('[CSRF] JSON parse error:', error)
			return null
		})
		
		console.log('[CSRF] API response data:', data)
		
		// ФИКС: правильная проверка структуры ответа
		const token = data && typeof data.csrf === 'string' && data.csrf.length > 0
			? data.csrf
			: null
		
		console.log('[CSRF] Extracted token:', token ? '✓' : '✗')
		return token
	} catch (error) {
		console.error('[CSRF] Fetch error:', error)
		return null
	}
}

/** Иногда браузер не сразу «видит» новую куку. Делаем короткий ретрай. */
async function readCsrfWithRetry(
	name = CSRF_NAME,
	tries = 6, // увеличим количество попыток
	delayMs = 100 // увеличим задержку
): Promise<string | null> {
	for (let i = 0; i < tries; i++) {
		const v = getCsrfToken(name)
		console.log(`[CSRF] Cookie check attempt ${i + 1}/${tries}:`, v ? '✓' : '✗')
		if (v && v.length > 0) {
			console.log('[CSRF] Token found in cookie:', v.substring(0, 8) + '...')
			return v
		}
		await new Promise(r => setTimeout(r, delayMs))
	}
	console.log('[CSRF] Token not found in cookie after retries')
	return null
}

async function ensureCsrfToken(): Promise<string> {
	console.log('[CSRF] Starting CSRF token ensure...')
	
	// 1) пробуем сразу из cookie
	let token = getCsrfToken(CSRF_NAME)
	console.log('[CSRF] Initial token from cookie:', token ? '✓' : '✗')
	
	if (token) {
		console.log('[CSRF] Using existing token from cookie')
		return token
	}

	// 2) просим у API токен + ретрай чтения куки
	console.log('[CSRF] No token in cookie, fetching from API...')
	const bodyToken = await fetchCsrfFromApi()
	token = (await readCsrfWithRetry(CSRF_NAME)) || bodyToken

	console.log('[CSRF] Token after first attempt:', token ? '✓' : '✗')

	// 3) последний шанс — повторная попытка
	if (!token) {
		console.log('[CSRF] Retrying CSRF token fetch...')
		const second = (await fetchCsrfFromApi()) || (await readCsrfWithRetry(CSRF_NAME, 8, 150))
		if (!second) {
			console.error('[CSRF] CSRF token not available after all retries')
			throw new Error('CSRF token not available')
		}
		token = second
		console.log('[CSRF] Token found after retry')
	}

	console.log('[CSRF] Token ensure completed successfully')
	return token
}

async function postJSON<T = any>(path: string, body?: unknown): Promise<T> {
	console.log(`[API] POST ${path}`)
	const token = await ensureCsrfToken()
	console.log(`[API] Using CSRF token: ${token.substring(0, 8)}...`)
	
	const res = await fetch(`${API}${path}`, {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRF-Token': token,
		},
		body: body ? JSON.stringify(body) : undefined,
	})
	
	console.log(`[API] Response status: ${res.status} ${res.statusText}`)
	
	const data = await res.json().catch(() => ({}))
	if (!res.ok) {
		console.error(`[API] Error: ${data?.message || res.status}`)
		throw new Error((data as any)?.message || `HTTP ${res.status}`)
	}
	
	console.log('[API] Request completed successfully')
	return data as T
}

async function deleteJSON<T = any>(path: string): Promise<T> {
	console.log(`[API] DELETE ${path}`)
	const token = await ensureCsrfToken()
	
	const res = await fetch(`${API}${path}`, {
		method: 'DELETE',
		credentials: 'include',
		headers: { 'X-CSRF-Token': token },
	})
	
	console.log(`[API] Response status: ${res.status} ${res.statusText}`)
	
	const data = await res.json().catch(() => ({}))
	if (!res.ok) {
		console.error(`[API] Error: ${data?.message || res.status}`)
		throw new Error((data as any)?.message || `HTTP ${res.status}`)
	}
	
	return data as T
}

async function getJSON<T = any>(path: string): Promise<T> {
	console.log(`[API] GET ${path}`)
	const res = await fetch(`${API}${path}`, {
		method: 'GET',
		credentials: 'include',
	})
	
	console.log(`[API] Response status: ${res.status} ${res.statusText}`)
	
	const data = await res.json().catch(() => ({}))
	if (!res.ok) {
		console.error(`[API] Error: ${data?.message || res.status}`)
		throw new Error((data as any)?.message || `HTTP ${res.status}`)
	}
	
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
