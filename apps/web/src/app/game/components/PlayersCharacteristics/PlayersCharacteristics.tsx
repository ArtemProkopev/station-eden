'use client'

import { GamePlayer } from '../../types/game.types'
import styles from './PlayersCharacteristics.module.css'

interface PlayersCharacteristicsProps {
  players: GamePlayer[]
  isOpen: boolean
  onClose: () => void
}

export default function PlayersCharacteristics({ 
  players, 
  isOpen, 
  onClose 
}: PlayersCharacteristicsProps) {
  if (!isOpen) return null

  // Все типы карт для заголовков таблицы
  const cardTypes = ['profession', 'health', 'psychology', 'secret', 'baggage', 'role', 'gender', 'age', 'body']

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Характеристики игроков</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.tableContainer}>
            <div className={styles.table}>
              {/* Заголовок таблицы */}
              <div className={styles.tableHeader}>
                <div className={styles.cornerCell}>Игрок / Тип</div>
                {cardTypes.map(type => (
                  <div key={type} className={styles.typeHeader}>
                    {getTypeLabel(type)}
                  </div>
                ))}
              </div>
              
              {/* Тело таблицы */}
              <div className={styles.tableBody}>
                {players.map(player => (
                  <div key={player.id} className={styles.playerRow}>
                    <div className={styles.playerCell}>
                      <div className={styles.playerInfo}>
                        <div className={styles.avatar}>
                          {player.avatar ? (
                            <img src={player.avatar} alt={player.username} />
                          ) : (
                            <div className={styles.avatarPlaceholder}>
                              {player.username.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className={styles.playerName}>{player.username}</span>
                      </div>
                    </div>
                    
                    {cardTypes.map(type => (
                      <div key={`${player.id}-${type}`} className={styles.cardCell}>
                        {player.cards
                          .filter(card => card.type === type && card.isRevealed)
                          .map(card => (
                            <div key={card.id} className={styles.cardBadge}>
                              {card.title}
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    profession: 'Профессия',
    health: 'Здоровье',
    psychology: 'Психология',
    secret: 'Секрет',
    baggage: 'Багаж',
    role: 'Роль',
    gender: 'Пол',
    age: 'Возраст',
    body: 'Телосложение'
  }
  return labels[type] || type
}