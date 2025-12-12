import { redirect } from 'next/navigation'
import GamePageClient from './GamePageClient'

type Props = {
  params: {
    gameId: string
  }
}

function isValidGameId(id: string) {
  return /^[a-z0-9]{3,20}$/i.test(id)
}

export default function GamePage({ params }: Props) {
  const gameId = params.gameId

  if (!isValidGameId(gameId)) {
    redirect('/lobby')
  }

  return <GamePageClient gameId={gameId} />
}