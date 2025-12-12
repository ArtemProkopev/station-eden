'use client'

import { GamePlayer } from '../../types/game.types'
import styles from './VotingSystem.module.css'

interface VotingSystemProps {
  players: GamePlayer[]
  onVote: (playerId: string) => void
  votedFor?: string | null
  timeLeft: number
}

export default function VotingSystem({ 
  players, 
  onVote, 
  votedFor, 
  timeLeft 
}: VotingSystemProps) {
  return (
    <div className={styles.votingContainer}>
      <div className={styles.votingHeader}>
        <h3 className={styles.votingTitle}>ГОЛОСОВАНИЕ</h3>
        <div className={styles.votingTimer}>
          <div className={styles.timerCircle}>
            <span className={styles.timerText}>{timeLeft}</span>
          </div>
          <span className={styles.timerLabel}>секунд</span>
        </div>
      </div>

      <div className={styles.votingContent}>
        <p className={styles.votingDescription}>
          Выберите игрока, которого хотите исключить со станции.
          {votedFor && ' Ваш голос уже учтен.'}
        </p>

        <div className={styles.candidatesGrid}>
          {players.map(player => (
            <div
              key={player.id}
              className={`${styles.candidateCard} ${
                votedFor === player.id ? styles.voted : ''
              }`}
              onClick={() => !votedFor && onVote(player.id)}
            >
              <div className={styles.candidateAvatar}>
                {player.avatar ? (
                  <img src={player.avatar} alt={player.username} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {player.username.charAt(0)}
                  </div>
                )}
              </div>
              
              <div className={styles.candidateInfo}>
                <h4 className={styles.candidateName}>{player.username}</h4>
                <div className={styles.candidateStats}>
                  <span className={styles.stat}>
                    Карт: {player.cards.length}
                  </span>
                  <span className={styles.stat}>
                    Открыто: {player.cards.filter(c => c.isRevealed).length}
                  </span>
                </div>
              </div>
              
              {votedFor === player.id && (
                <div className={styles.voteBadge}>
                  ✓ Ваш голос
                </div>
              )}
              
              {!votedFor && (
                <button 
                  className={styles.voteButton}
                  onClick={() => onVote(player.id)}
                >
                  Голосовать
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}