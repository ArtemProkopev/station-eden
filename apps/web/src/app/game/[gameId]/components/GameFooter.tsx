// apps/web/src/app/game/[gameId]/components/GameFooter.tsx
import { ExtendedGameState, ExtendedGamePlayer } from '@station-eden/shared'
import styles from '../page.module.css'

interface GameFooterProps {
  gameState: ExtendedGameState
  currentPlayer?: ExtendedGamePlayer
  myRevealedCardsThisRound: string[]
  myAllRevealedCards: Record<string, { name: string; type: string }>
  alivePlayers: ExtendedGamePlayer[]
  onShowCardsTable: () => void
}

export default function GameFooter({ 
  gameState, 
  currentPlayer, 
  myRevealedCardsThisRound, 
  myAllRevealedCards, 
  alivePlayers, 
  onShowCardsTable 
}: GameFooterProps) {
  const players = (gameState.players || []) as ExtendedGamePlayer[]
  
  const playersWithRevealedCards = players.filter(
    p => p.revealedCards && p.revealedCards > 0
  ).length

  return (
    <footer className={styles.footer}>
      <div className={styles.playerStatusInfo}>
        {currentPlayer && (
          <>
            <span>Статус: {currentPlayer.isAlive ? 'Жив' : 'Выбыл'}</span>
            <span>Раскрыто в раунде: {myRevealedCardsThisRound.length}/1</span>
            <span>Всего раскрыто: {Object.keys(myAllRevealedCards).length}</span>
            {gameState.phase === 'discussion' && (
              <span>Раскрыли карты: {playersWithRevealedCards}/{alivePlayers.length}</span>
            )}
          </>
        )}
      </div>

      <div className={styles.gameRules}>
        <button
          className={styles.rulesButton}
          onClick={() => window.open('/rules', '_blank')}
        >
          Правила
        </button>
        <button
          className={styles.tableButton}
          onClick={onShowCardsTable}
        >
          Таблица карт
        </button>
      </div>
    </footer>
  )
}