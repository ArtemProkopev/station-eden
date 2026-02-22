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
  // Приводим players к ExtendedGamePlayer[]
  const players = (gameState.players || []) as ExtendedGamePlayer[]
  
  // Считаем игроков, которые раскрыли карты
  const playersWithRevealedCards = players.filter(
    p => p.revealedCards && p.revealedCards > 0
  ).length

  return (
    <footer className={styles.footer}>
      <div className={styles.playerStatusInfo}>
        {currentPlayer && (
          <>
            <span>Ваш статус: {currentPlayer.isAlive ? 'Жив' : 'Выбыл'}</span>
            <span>
              {' '}
              | Карт раскрыто в раунде: {myRevealedCardsThisRound.length}/1
            </span>
            <span>
              {' '}
              | Всего карт раскрыто: {Object.keys(myAllRevealedCards).length}
            </span>
            {gameState.phase === 'discussion' && (
              <span>
                {' '}
                | Игроков раскрыли карты:{' '}
                {playersWithRevealedCards}/{alivePlayers.length}
              </span>
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