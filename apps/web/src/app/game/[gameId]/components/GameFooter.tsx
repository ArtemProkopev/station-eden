// apps/web/src/app/game/[gameId]/components/GameFooter.tsx
import { GameState, GamePlayer } from './types/game.types'
import styles from '../page.module.css'

interface GameFooterProps {
  gameState: GameState
  currentPlayer?: GamePlayer
  myRevealedCardsThisRound: string[]
  myAllRevealedCards: Record<string, { name: string; type: string }>
  alivePlayers: GamePlayer[]
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
                {gameState.players?.filter(
                  p => p.revealedCards && p.revealedCards > 0
                ).length || 0}
                /{alivePlayers.length}
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