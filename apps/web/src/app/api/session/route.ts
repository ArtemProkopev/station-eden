// apps/web/src/app/api/session/route.ts

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
const CSRF_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || 'se_csrf'

async function me(cookieHeader: string) {
	return fetch(`${API}/auth/me`, {
		method: 'GET',
		headers: { cookie: cookieHeader },
		credentials: 'include',
		cache: 'no-store',
	})
}

/**
 * Получаем CSRF-токен с учётом текущих cookie.
 * Токен возвращается и в cookie, и в теле ответа { csrf }, мы читаем из тела.
 */
async function getCsrf(cookieHeader: string): Promise<string | null> {
	try {
		const r = await fetch(`${API}/auth/csrf`, {
			method: 'GET',
			headers: { cookie: cookieHeader },
			credentials: 'include',
			cache: 'no-store',
		})
		if (!r.ok) return null
		const json = await r.json().catch(() => undefined)
		// Ответ может быть как { csrf }, так и { ok: true, data: { csrf } }
		const token = json?.csrf ?? json?.data?.csrf ?? null
		return typeof token === 'string' && token ? token : null
	} catch {
		return null
	}
}

async function refresh(cookieHeader: string) {
	// Обязательно получаем актуальный CSRF токен перед POST
	const csrf = await getCsrf(cookieHeader)
	if (!csrf) {
		// Без CSRF не пробуем — вернём псевдо-ответ с 403, чтобы вызывающий код понял, что рефреш невозможен
		return new Response('missing csrf', { status: 403 })
	}

	return fetch(`${API}/auth/refresh`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			cookie: cookieHeader,
			'x-csrf-token': csrf,
		},
		credentials: 'include',
		body: '{}',
		cache: 'no-store',
	})
}

export async function GET(req: Request) {
	const cookieHeader = req.headers.get('cookie') || ''
	const hasRefreshCookie = /(?:^|;\s*)refresh_token=/.test(cookieHeader)

	// 1) Пытаемся прочитать сессию
	try {
		const r = await me(cookieHeader)
		if (r.ok) {
			const json = await r.json().catch(() => ({}))
			const data = (json?.data ?? json) as any
			return new Response(
				JSON.stringify({ status: 'signed-in', email: data?.email }),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			)
		}
	} catch {
		// игнорируем и идём дальше
	}

	// 2) Если нет refresh_token — считаем, что пользователь не авторизован и не пытаемся рефрешить
	if (!hasRefreshCookie) {
		return new Response(JSON.stringify({ status: 'signed-out' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	// 3) Пробуем рефреш только если refresh_token есть
	try {
		const rr = await refresh(cookieHeader)
		if (rr.ok) {
			// После успешного refresh пробуем ещё раз /auth/me
			const r = await me(cookieHeader)
			if (r.ok) {
				const json = await r.json().catch(() => ({}))
				const data = (json?.data ?? json) as any
				return new Response(
					JSON.stringify({ status: 'signed-in', email: data?.email }),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				)
			}
		}
		// Если refresh вернул 401/403/и т.п. — считаем signed-out
	} catch {
		// игнор
	}

	return new Response(JSON.stringify({ status: 'signed-out' }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	})
}
