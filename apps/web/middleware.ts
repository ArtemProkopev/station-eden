import { NextResponse, type NextRequest } from 'next/server'

// Исключаем API и статику, чтобы CSP не конфликтовала
export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

export const runtime = 'nodejs'

export async function middleware(req: NextRequest) {
	// --- 1. CSP ---
	const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

	// Разрешаем CDN
	const cspHeader = `
		default-src 'self';
		script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
		style-src 'self' 'unsafe-inline';
		img-src 'self' blob: data: https://cdn.assets.stationeden.ru https://stationeden.ru;
		font-src 'self';
		object-src 'none';
		base-uri 'self';
		form-action 'self';
		frame-ancestors 'none';
		connect-src 'self' https://api.stationeden.ru wss://api.stationeden.ru;
		upgrade-insecure-requests;
	`
		.replace(/\s{2,}/g, ' ')
		.trim()

	const requestHeaders = new Headers(req.headers)
	requestHeaders.set('x-nonce', nonce)
	requestHeaders.set('Content-Security-Policy', cspHeader)

	// --- 2. Проверка авторизации (только /profile) ---
	if (req.nextUrl.pathname.startsWith('/profile')) {
		const apiBase = process.env.NEXT_PUBLIC_API_BASE
		const cookie = req.headers.get('cookie') || ''

		if (apiBase) {
			const ac = new AbortController()
			const to = setTimeout(() => ac.abort(), 1500)

			try {
				const res = await fetch(`${apiBase}/auth/me`, {
					headers: { cookie },
					credentials: 'include',
					cache: 'no-store',
					signal: ac.signal,
				})
				clearTimeout(to)

				if (!res.ok) {
					throw new Error('Not auth')
				}
			} catch {
				clearTimeout(to)
				const url = req.nextUrl.clone()
				url.pathname = '/login'
				url.searchParams.set('next', req.nextUrl.pathname)
				return NextResponse.redirect(url)
			}
		}
	}

	const response = NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	})

	response.headers.set('Content-Security-Policy', cspHeader)

	return response
}
