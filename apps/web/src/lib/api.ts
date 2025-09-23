// apps/web/src/lib/api.ts
import { getCsrfToken } from './csrf'

const API = process.env.NEXT_PUBLIC_API_BASE || 'https://api.stationeden.ru'
const CSRF_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || 'se_csrf'

// --- внутренние утилиты ---

// Гарантируем наличие CSRF-куки и, по возможности, получаем токен
async function ensureCsrf() {
	const res = await fetch(`${API}/auth/csrf`, {
		method: 'GET',
		credentials: 'include',
	})
	// Ответ может содержать { csrf }, но нам достаточно факта установки куки
	try {
		await res.json()
	} catch {}
}

async function postJSON<T = any>(path: string, body?: unknown): Promise<T> {
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
	if (!res.ok) throw new Error((data as any)?.message || `HTTP ${res.status}`)
	return data as T
}

async function deleteJSON<T = any>(path: string): Promise<T> {
	await ensureCsrf()
	const token = getCsrfToken(CSRF_NAME)
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

// Возможный авто-рефреш, если понадобится.
// Оставляем утилиту на будущее: можно заюзать в getJSON/postJSON при 401.
/*
async function getWithRefresh<T=any>(path: string): Promise<T> {
  try {
    return await getJSON<T>(path)
  } catch (e: any) {
    if (/HTTP 401/.test(e?.message)) {
      try { await api.refresh() } catch {}
      return await getJSON<T>(path)
    }
    throw e
  }
}
*/

// --- публичное API, которое импортируют страницы ---

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

	// --- Админка пользователей (JwtAuthGuard + AdminGuard на бэке) ---
	// Список пользователей
	users: () => getJSON('/users'),
	// Пользователь по id
	userById: (id: string) => getJSON(`/users/${encodeURIComponent(id)}`),
	// Удаление пользователя
	deleteUser: (id: string) => deleteJSON(`/users/${encodeURIComponent(id)}`),
}
