// apps/web/src/app/game/[gameId]/page.tsx
import GameSessionClient from './GameSessionClient'

export default async function Page({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params
  return <GameSessionClient gameId={gameId} />
}
