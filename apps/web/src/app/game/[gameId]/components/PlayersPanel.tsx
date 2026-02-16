// apps/web/src/app/game/[gameId]/components/PlayersPanel.tsx
import { GameState, GamePlayer } from './types/game.types'
import styles from '../page.module.css'

interface PlayersPanelProps {
  gameState: GameState
  userId?: string
  gamePhase: string
  currentPlayer?: GamePlayer
  onVote: (targetPlayerId: string) => void
  onShowMyCards: () => void
  onShowCardsTable: () => void
}

export default function PlayersPanel({ 
  gameState, 
  userId, 
  gamePhase, 
  currentPlayer,
  onVote,
  onShowMyCards,
  onShowCardsTable
}: PlayersPanelProps) {
  const alivePlayers = gameState.players?.filter(p => p.isAlive) || []
  const ejectedPlayers = gameState.players?.filter(p => !p.isAlive) || []

  return (
    <section className={styles.playersPanel}>
      <div className={styles.panelHeader}>
        <h2>Экипаж ({alivePlayers.length} живых)</h2>
        <div className={styles.panelActions}>
          <button className={styles.smallButton} onClick={onShowMyCards}>
            Мои карты
          </button>
          <button className={styles.smallButton} onClick={onShowCardsTable}>
            Таблица карт
          </button>
        </div>
      </div>

      <div className={styles.playersList}>
        {gameState.players?.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            userId={userId}
            gamePhase={gamePhase}
            creatorId={gameState.creatorId}
            currentPlayer={currentPlayer}
            onVote={onVote}
          />
        ))}
      </div>

      {ejectedPlayers.length > 0 && (
        <div className={styles.ejectedPlayers}>
          <h3>Выбывшие ({ejectedPlayers.length}):</h3>
          <div className={styles.ejectedList}>
            {ejectedPlayers.map(player => (
              <span key={player.id} className={styles.ejectedPlayer}>
                {player.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

interface PlayerCardProps {
  player: GamePlayer
  userId?: string
  gamePhase: string
  creatorId?: string
  currentPlayer?: GamePlayer
  onVote: (targetPlayerId: string) => void
}

function PlayerCard({ player, userId, gamePhase, creatorId, currentPlayer, onVote }: PlayerCardProps) {
  return (
    <div
      className={`${styles.playerCard} ${!player.isAlive ? styles.dead : ''} ${
        userId && player.id === userId ? styles.me : ''
      } ${userId && player.vote === userId ? styles.votedForMe : ''}`}
    >
      <div className={styles.playerHeader}>
        <div className={styles.playerAvatar}>
          {player.avatar ? (
            <img src={player.avatar} alt={player.name} />
          ) : (
            <span>{player.name.charAt(0)}</span>
          )}
        </div>

        <div className={styles.playerInfo}>
          <h3>
            {player.name}
            {userId && player.id === userId && ' (Вы)'}
            {player.id === creatorId && ' 👑'}
          </h3>
          <div className={styles.playerStatus}>
            {player.isAlive ? (
              <span className={styles.alive}>Жив</span>
            ) : (
              <span className={styles.deadStatus}>Выбыл</span>
            )}
            {player.profession && (
              <span className={styles.playerProfession}>
                {player.profession}
              </span>
            )}
          </div>
          <div className={styles.playerStats}>
            <span>Карт раскрыто: {player.revealedCards || 0}</span>
            <span> | Очки: {player.score || 0}</span>
          </div>
        </div>
      </div>

      {gamePhase === 'voting' &&
        player.isAlive &&
        userId &&
        player.id !== userId && (
          <div className={styles.voteSection}>
            <button
              className={styles.voteButton}
              onClick={() => onVote(player.id)}
              disabled={
                !currentPlayer?.isAlive ||
                Boolean(currentPlayer?.vote)
              }
            >
              Голосовать против
            </button>
            <div className={styles.voteCount}>
              Голосов: {player.votesAgainst || 0}
            </div>
          </div>
        )}
    </div>
  )
}