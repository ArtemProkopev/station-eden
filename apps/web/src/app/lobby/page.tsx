// apps/web/src/app/lobby/page.tsx
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function LobbyPage() {
	const lobbyId = Math.random().toString(36).substring(2, 10)
	redirect(`/lobby/${lobbyId}`)
}
