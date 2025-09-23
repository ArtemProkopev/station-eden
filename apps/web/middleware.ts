// apps/web/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

export const config = {
	matcher: ['/profile'], // расширишь — добавь сюда новые защищённые пути
}

// важный момент: в проде Edge не достучится до локального API.
// для дев/самохостинга предпочтительнее nodejs runtime.
export const runtime = 'nodejs'

export async function middleware(req: NextRequest) {
	const apiBase = process.env.NEXT_PUBLIC_API_BASE
	if (!apiBase) {
		// если отсутствует базовый URL API — пускаем дальше, чтобы не словить вечные редиректы
		return NextResponse.next()
	}

	const cookie = req.headers.get('cookie') || ''

	// короткий таймаут (1.5s), чтобы не подвешивать навигацию
	const ac = new AbortController()
	const to = setTimeout(() => ac.abort(), 1500)

	try {
		const res = await fetch(`${apiBase}/auth/me`, {
			headers: { cookie },
			// credentials в среде middleware роли не играет, но пусть будет
			credentials: 'include',
			// чтобы не тащить потенциально закэшированный ответ
			cache: 'no-store',
			signal: ac.signal,
		})

		clearTimeout(to)

		if (res.ok) {
			return NextResponse.next()
		}
	} catch {
		clearTimeout(to)
		// молча падаем в редирект
	}

	const url = req.nextUrl.clone()
	url.pathname = '/login'
	url.searchParams.set('next', req.nextUrl.pathname) // не хардкодим /profile
	return NextResponse.redirect(url)
}
