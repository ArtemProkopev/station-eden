// apps/web/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

export const runtime = 'nodejs'

function buildCsp() {
	const api = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
	const ws = process.env.NEXT_PUBLIC_WS_BASE || ''

	// CSP без strict-dynamic и без nonce — зато не ломает Next.
	// В dev иногда нужен unsafe-eval (React/Next дев-режим).
	const isDev = process.env.NODE_ENV !== 'production'
	const scriptExtra = isDev ? " 'unsafe-eval'" : ''

	return `
		default-src 'self';
		script-src 'self' 'unsafe-inline'${scriptExtra};
		style-src 'self' 'unsafe-inline';
		img-src 'self' blob: data: https://cdn.assets.stationeden.ru https://stationeden.ru;
		font-src 'self' data:;
		object-src 'none';
		base-uri 'self';
		form-action 'self';
		frame-ancestors 'none';
		connect-src
			'self'
			${api}
			${ws}
			https://*.livekit.cloud
			wss://*.livekit.cloud;
	`
		.replace(/\s{2,}/g, ' ')
		.trim()
}

export async function middleware(req: NextRequest) {
	const cspHeader = buildCsp()

	// --- Проверка авторизации (только /profile) ---
	if (req.nextUrl.pathname.startsWith('/profile')) {
		const apiBase = process.env.NEXT_PUBLIC_API_BASE
		const cookie = req.headers.get('cookie') || ''

		if (apiBase) {
			const ac = new AbortController()
			const to = setTimeout(() => ac.abort(), 1500)

			try {
				const res = await fetch(`${apiBase.replace(/\/+$/, '')}/auth/me`, {
					headers: { cookie },
					cache: 'no-store',
					signal: ac.signal,
				})
				clearTimeout(to)

				if (!res.ok) throw new Error('Not auth')
			} catch {
				clearTimeout(to)
				const url = req.nextUrl.clone()
				url.pathname = '/login'
				url.searchParams.set('next', req.nextUrl.pathname)
				return NextResponse.redirect(url)
			}
		}
	}

	const response = NextResponse.next()
	response.headers.set('Content-Security-Policy', cspHeader)
	return response
}
