const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

function getCookie(name: string) {
	if (typeof document === 'undefined') return null
	return (
		document.cookie
			.split('; ')
			.find(c => c.startsWith(name + '='))
			?.split('=')[1] ?? null
	)
}

function emitSession(status: 'signed-in' | 'signed-out') {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(
			new CustomEvent('session-changed', { detail: { status } })
		)
	}
}

async function fetchJSON<T>(
	path: string,
	init?: RequestInit & { csrf?: boolean }
) {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' }
	if (init?.csrf) {
		const token = getCookie('csrf_token')
		if (token) headers['x-csrf-token'] = token
	}
	const res = await fetch(`${API}${path}`, {
		...init,
		headers,
		credentials: 'include',
	})

	if (!res.ok) {
		let msg = ''
		try {
			const txt = await res.text()
			try {
				const j = txt ? JSON.parse(txt) : {}
				msg =
					(j && (j.message || j.error)) ||
					(typeof j === 'string' ? j : '') ||
					txt
			} catch {
				msg = txt
			}
		} catch {}
		throw new Error(msg || `HTTP ${res.status}`)
	}

	const text = await res.text()
	if (!text) return {} as T

	const json = JSON.parse(text)
	const data =
		json && typeof json === 'object' && 'data' in json ? json.data : json
	return data as T
}

export async function ensureCsrf() {
	await fetchJSON('/auth/csrf', { method: 'GET' })
}

export const api = {
	register: async (email: string, password: string) => {
		await ensureCsrf()
		return fetchJSON<{ mfa: 'email_code_sent'; email: string }>(
			'/auth/register',
			{
				method: 'POST',
				csrf: true,
				body: JSON.stringify({ email, password }),
			}
		)
	},

	login: async (email: string, password: string) => {
		await ensureCsrf()
		const r = await fetchJSON<{ mfa: 'email_code_sent'; email: string }>(
			'/auth/login',
			{
				method: 'POST',
				csrf: true,
				body: JSON.stringify({ email, password }),
			}
		)
		return r
	},

	verifyEmailCode: async (code: string, email?: string) => {
		await ensureCsrf()
		const r = await fetchJSON<{
			user: { id: string; email: string; role: string }
		}>('/auth/verify-email-code', {
			method: 'POST',
			csrf: true,
			body: JSON.stringify({ code, email }),
		})
		emitSession('signed-in')
		return r
	},

	resendEmailCode: async () => {
		await ensureCsrf()
		return fetchJSON<{ ok: true }>('/auth/resend-email-code', {
			method: 'POST',
			csrf: true,
			body: '{}',
		})
	},

	me: async () =>
		fetchJSON<{ userId: string; email: string }>('/auth/me', { method: 'GET' }),

	refresh: async () => {
		await ensureCsrf()
		const r = await fetchJSON('/auth/refresh', {
			method: 'POST',
			csrf: true,
			body: '{}',
		})
		emitSession('signed-in')
		return r
	},

	logout: async () => {
		await ensureCsrf()
		const r = await fetchJSON('/auth/logout', {
			method: 'POST',
			csrf: true,
			body: '{}',
		})
		emitSession('signed-out')
		return r
	},

	users: async () => fetchJSON('/users', { method: 'GET' }),
	deleteUser: async (id: string) => {
		await ensureCsrf()
		return fetchJSON(`/users/${id}`, {
			method: 'DELETE',
			csrf: true,
			body: '{}',
		})
	},
}
