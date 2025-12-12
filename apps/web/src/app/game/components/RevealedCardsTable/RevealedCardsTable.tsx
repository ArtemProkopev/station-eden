'use client'

import { Card } from '../../types/game.types'
import styles from './RevealedCardsTable.module.css'

interface RevealedCardsTableProps {
  revealedCards: Record<string, Card[]>
  isOpen: boolean
  onClose: () => void
}

export default function RevealedCardsTable({ 
  revealedCards, 
  isOpen, 
  onClose 
}: RevealedCardsTableProps) {
  if (!isOpen) return null

  const players = Object.entries(revealedCards)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Открытые карты игроков</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className={styles.content}>
          {players.length === 0 ? (
            <p className={styles.emptyMessage}>Пока не открыто ни одной карты</p>
          ) : (
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <div className={styles.headerCell}>Игрок</div>
                <div className={styles.headerCell}>Тип карты</div>
                <div className={styles.headerCell}>Название</div>
                <div className={styles.headerCell}>Описание</div>
              </div>
              
              {players.map(([playerId, cards]) => (
                cards.map(card => (
                  <div key={`${playerId}-${card.id}`} className={styles.tableRow}>
                    <div className={styles.cell}>{getPlayerName(playerId)}</div>
                    <div className={styles.cell}>
                      <span className={`${styles.typeBadge} ${styles[card.type]}`}>
                        {getTypeLabel(card.type)}
                      </span>
                    </div>
                    <div className={styles.cell}>{card.title}</div>
                    <div className={styles.cell}>{card.description}</div>
                  </div>
                ))
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getPlayerName(playerId: string): string {
  // Здесь должна быть логика получения имени игрока по ID
  return `Игрок ${playerId.slice(0, 4)}`
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    profession: 'Проф',
    health: 'Здоровье',
    psychology: 'Психология',
    secret: 'Секрет',
    baggage: 'Багаж'
  }
  return labels[type] || type
}