// apps/web/src/app/game/[gameId]/components/phase-actions/VotingActions.tsx
import { GamePlayer } from '../types/game.types'
import { formatTime } from '../utils/game.utils'
import styles from '../../page.module.css'

interface VotingActionsProps {
  phaseTimeLeft: number
  alivePlayers: GamePlayer[]
  userId?: string
  currentPlayer?: GamePlayer
  onVote: (targetPlayerId: string) => void
}

export default function VotingActions({ 
  phaseTimeLeft, 
  alivePlayers, 
  userId, 
  currentPlayer, 
  onVote 
}: VotingActionsProps) {
  return (
    <div className={styles.phaseActions}>
      <div className={styles.votingHeader}>
        <h3>Голосуйте за исключение игрока</h3>
        <p>Время на голосование: {formatTime(phaseTimeLeft)}</p>
      </div>
      <div className={styles.votingGrid}>
        {alivePlayers
          .filter(p => p.id !== userId)
          .map(player => (
            <VoteOption
              key={player.id}
              player={player}
              currentPlayer={currentPlayer}
              onVote={onVote}
            />
          ))}
      </div>
    </div>
  )
}

interface VoteOptionProps {
  player: GamePlayer
  currentPlayer?: GamePlayer
  onVote: (targetPlayerId: string) => void
}

function VoteOption({ player, currentPlayer, onVote }: VoteOptionProps) {
  const isSelected = currentPlayer?.vote === player.id

  return (
    <button
      className={`${styles.voteOption} ${isSelected ? styles.selected : ''}`}
      onClick={() => onVote(player.id)}
      disabled={!currentPlayer?.isAlive || Boolean(currentPlayer?.vote)}
    >
      <div className={styles.votePlayerInfo}>
        <span className={styles.votePlayerName}>{player.name}</span>
        {player.profession && (
          <span className={styles.votePlayerProfession}>
            {player.profession}
          </span>
        )}
      </div>
      <div className={styles.voteCount}>
        Голосов: {player.votesAgainst || 0}
      </div>
    </button>
  )
}