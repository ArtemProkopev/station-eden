// apps/web/src/app/lobby/[lobbyId]/page.tsx
import { redirect } from 'next/navigation'
import LobbyPageClient from './LobbyPageClient'

// Валидация ID лобби
function isValidLobbyId(id: string) {
	return /^[a-zA-Z0-9_-]{3,32}$/.test(id)
}

export default async function LobbyPage({
	params,
}: {
	params: Promise<{ lobbyId: string }>
}) {
	const { lobbyId } = await params

	if (!isValidLobbyId(lobbyId)) {
		redirect('/lobby')
	}

	return <LobbyPageClient lobbyId={lobbyId} />
}
