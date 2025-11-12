// apps/web/src/app/api/session/route.ts

// Используем один и тот же origin API и для SSR, и для клиента.
// В проде выставь NEXT_PUBLIC_API_BASE = 'https://api.stationeden.ru'
const API = process.env.NEXT_PUBLIC_API_BASE || 'https://api.stationeden.ru'

/**
 * Ходим за /auth/me с прокидыванием куки, которые пришли от браузера.
 */
async function me(cookieHeader: string) {
	return fetch(`${API}/auth/me`, {
		method: 'GET',
		headers: { cookie: cookieHeader },
		credentials: 'include',
		cache: 'no-store',
	})
}

/**
 * Получаем CSRF-токен и одновременно вытаскиваем se_csrf из Set-Cookie,
 * чтобы подложить его в cookieHeader для следующего POST.
 */
async function getCsrfAndCookieHeader(
	cookieHeader: string
): Promise<{ csrf: string | null; cookieHeader: string }> {
	try {
		const r = await fetch(`${API}/auth/csrf`, {
			method: 'GET',
			headers: { cookie: cookieHeader },
			credentials: 'include',
			cache: 'no-store',
		})
		if (!r.ok) return { csrf: null, cookieHeader }

		// Токен может прийти как { csrf }, так и { ok:true, data:{ csrf } }
		const json = await r.json().catch(() => undefined)
		const token = (json?.csrf ?? json?.data?.csrf) || null

		// Достаём se_csrf из Set-Cookie
		const setCookie = r.headers.get('set-cookie') || ''
		const m = setCookie.match(/(?:^|;)\s*se_csrf=([^;]+)/i)
		const se = m?.[1]

		// Если в исходном cookieHeader не было se_csrf — подложим
		const hasSe = /(?:^|;\s*)se_csrf=/.test(cookieHeader)
		const nextCookieHeader =
			!hasSe && se
				? cookieHeader
					? `${cookieHeader}; se_csrf=${se}`
					: `se_csrf=${se}`
				: cookieHeader

		return {
			csrf: typeof token === 'string' && token ? token : null,
			cookieHeader: nextCookieHeader,
		}
	} catch {
		return { csrf: null, cookieHeader }
	}
}

/**
 * POST /auth/refresh c правильными куками и заголовком CSRF.
 * Здесь важно: одновременно отправляем и cookie se_csrf, и заголовок x-csrf-token.
 */
async function refresh(cookieHeader: string) {
	const { csrf, cookieHeader: cookieWithCsrf } =
		await getCsrfAndCookieHeader(cookieHeader)
	if (!csrf) {
		// Без CSRF не пробуем — вернём 403, чтобы вызывающий код понял, что рефреш невозможен
		return new Response('missing csrf', { status: 403 })
	}

	return fetch(`${API}/auth/refresh`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			cookie: cookieWithCsrf, // cookieHeader, в который мы подложили se_csrf (если его не было)
			'x-csrf-token': csrf, // сам токен в заголовке
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

	// 2) Если нет refresh_token — пользователь не авторизован, не пытаемся рефрешить
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
			// ВАЖНО: этот handler не проксирует Set-Cookie из ответа API в браузер.
			// Мы просто возвращаем статус. Фактическое продление куки произойдёт
			// в клиентских запросах к API, где браузер получит Set-Cookie напрямую.
			//
			// Попробуем ещё раз /auth/me c тем же cookieHeader (без новых Set-Cookie).
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
