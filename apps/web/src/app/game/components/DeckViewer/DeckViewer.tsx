'use client'

import { Card } from '../../types/game.types'
import styles from './DeckViewer.module.css'

interface DeckViewerProps {
  player: {
    cards: Card[]
  }
  isOpen: boolean
  onClose: () => void
}

export default function DeckViewer({ player, isOpen, onClose }: DeckViewerProps) {
  if (!isOpen) return null

  const groupedCards = player.cards.reduce((acc, card) => {
    if (!acc[card.type]) acc[card.type] = []
    acc[card.type].push(card)
    return acc
  }, {} as Record<string, Card[]>)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Моя колода</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className={styles.content}>
          {Object.entries(groupedCards).map(([type, cards]) => (
            <div key={type} className={styles.cardGroup}>
              <h3 className={styles.groupTitle}>
                {getTypeLabel(type)} ({cards.length})
              </h3>
              <div className={styles.cardsGrid}>
                {cards.map(card => (
                  <div key={card.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>{card.title}</span>
                      {!card.isRevealed && (
                        <span className={styles.secretBadge}>Секретно</span>
                      )}
                    </div>
                    <p className={styles.cardDescription}>{card.description}</p>
                    {card.bonus && (
                      <div className={styles.bonus}>
                        <strong>Плюс:</strong> {card.bonus}
                      </div>
                    )}
                    {card.penalty && (
                      <div className={styles.penalty}>
                        <strong>Минус:</strong> {card.penalty}
                      </div>
                    )}
                    {card.ability && (
                      <div className={styles.ability}>
                        <strong>Способность:</strong> {card.ability}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    profession: 'Профессии',
    health: 'Состояние здоровья',
    psychology: 'Психологические черты',
    secret: 'Секреты',
    baggage: 'Багаж/Ресурсы',
    role: 'Роли',
    gender: 'Пол',
    age: 'Возраст',
    body: 'Телосложение'
  }
  return labels[type] || type
}