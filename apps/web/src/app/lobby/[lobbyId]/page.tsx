// apps/web/src/app/lobby/[lobbyId]/page.tsx
import { redirect } from 'next/navigation'
import LobbyPageClient from './LobbyPageClient'

// Валидация ID лобби
function isValidLobbyId(id: string) {
  return /^[a-z0-9]{3,20}$/i.test(id)
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
