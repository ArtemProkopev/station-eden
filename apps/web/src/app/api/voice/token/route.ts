// apps/web/src/app/api/voice/token/route.ts
const API = process.env.NEXT_PUBLIC_API_BASE || 'https://api.stationeden.ru'

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url)
	const lobbyId = searchParams.get('lobbyId') || ''

	const cookieHeader = req.headers.get('cookie') || ''

	const r = await fetch(
		`${API}/voice/token?lobbyId=${encodeURIComponent(lobbyId)}`,
		{
			method: 'GET',
			headers: {
				cookie: cookieHeader,
			},
			cache: 'no-store',
		}
	)

	const text = await r.text().catch(() => '')

	return new Response(text, {
		status: r.status,
		headers: {
			'Content-Type': r.headers.get('Content-Type') || 'application/json',
			'Cache-Control': 'no-store',
		},
	})
}
