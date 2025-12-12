'use client'

import { GamePlayer } from '../../types/game.types'
import styles from './PlayersList.module.css'

interface PlayersListProps {
  players: GamePlayer[]
  currentUserId?: string
  onPlayerClick: (player: GamePlayer) => void
  gamePhase: string
}

export default function PlayersList({ 
  players, 
  currentUserId, 
  onPlayerClick,
  gamePhase 
}: PlayersListProps) {
  return (
    <div className={styles.playersList}>
      <h2 className={styles.title}>Игроки ({players.length})</h2>
      
      <div className={styles.playersContainer}>
        {players.map(player => (
          <div
            key={player.id}
            className={`${styles.playerCard} ${
              player.id === currentUserId ? styles.currentUser : ''
            } ${!player.isAlive ? styles.ejected : ''}`}
            onClick={() => onPlayerClick(player)}
          >
            <div className={styles.playerHeader}>
              <div className={styles.avatar}>
                {player.avatar ? (
                  <img src={player.avatar} alt={player.username} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {player.username.charAt(0)}
                  </div>
                )}
              </div>
              
              <div className={styles.playerInfo}>
                <h3 className={styles.username}>
                  {player.username}
                  {player.id === currentUserId && ' (Вы)'}
                </h3>
                <div className={styles.status}>
                  {!player.isAlive ? (
                    <span className={styles.ejectedStatus}>Выбыл</span>
                  ) : player.isInCapsule ? (
                    <span className={styles.inCapsule}>В капсуле</span>
                  ) : (
                    <span className={styles.alive}>Жив</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className={styles.playerStats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Карт:</span>
                <span className={styles.statValue}>{player.cards.length}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Открыто:</span>
                <span className={styles.statValue}>
                  {player.cards.filter(c => c.isRevealed).length}
                </span>
              </div>
              {player.hasRevealedCard && (
                <div className={styles.revealedBadge}>
                  Раскрыл карту
                </div>
              )}
            </div>
            
            {player.role && gamePhase === 'reveal' && (
              <div className={styles.roleBadge}>
                Роль: {player.role}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}