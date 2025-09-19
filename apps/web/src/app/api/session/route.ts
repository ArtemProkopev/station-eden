import { cookies } from 'next/headers'

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

async function me(cookieHeader: string) {
	const r = await fetch(`${API}/auth/me`, {
		method: 'GET',
		headers: { cookie: cookieHeader },
		credentials: 'include',
		cache: 'no-store',
	})
	return r
}

async function refresh(cookieHeader: string) {
	// для refresh нужен CSRF
	const jar = cookies()
	const csrf = jar.get('csrf_token')?.value ?? ''
	const r = await fetch(`${API}/auth/refresh`, {
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
	return r
}

export async function GET(req: Request) {
	// берём исходные куки пользователя и пробуем /auth/me
	const cookieHeader = req.headers.get('cookie') || ''

	// 1) пробуем me
	let r = await me(cookieHeader)
	if (r.ok) {
		const json = await r.json()
		const data = json?.data ?? json
		return new Response(
			JSON.stringify({ status: 'signed-in', email: data.email }),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		)
	}

	// 2) пробуем refresh → потом снова me
	const rr = await refresh(cookieHeader)
	if (rr.ok) {
		r = await me(cookieHeader)
		if (r.ok) {
			const json = await r.json()
			const data = json?.data ?? json
			return new Response(
				JSON.stringify({ status: 'signed-in', email: data.email }),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}
			)
		}
	}

	// 3) не авторизован
	return new Response(JSON.stringify({ status: 'signed-out' }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	})
}
