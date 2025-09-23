import { cookies } from 'next/headers'

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

async function me(cookieHeader: string) {
	return fetch(`${API}/auth/me`, {
		method: 'GET',
		headers: { cookie: cookieHeader },
		credentials: 'include',
		cache: 'no-store',
	})
}

async function refresh(cookieHeader: string) {
	const jar = cookies()
	const csrf = jar.get('csrf_token')?.value ?? ''
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

	// 1) /auth/me
	try {
		const r = await me(cookieHeader)
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
	} catch {
		return new Response(JSON.stringify({ status: 'signed-out' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	// 2) refresh -> me
	try {
		const rr = await refresh(cookieHeader)
		if (rr.ok) {
			const r = await me(cookieHeader)
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
	} catch {}

	return new Response(JSON.stringify({ status: 'signed-out' }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	})
}
