'use client'

import { GamePlayer } from '../../types/game.types'
import styles from './PlayerInfo.module.css'

interface PlayerInfoProps {
  player: GamePlayer | null
  gamePhase: string
  onRevealCard: (cardId: string) => void
  onUseAbility: (abilityId: string, targetId?: string) => void
}

export default function PlayerInfo({ 
  player, 
  gamePhase, 
  onRevealCard, 
  onUseAbility 
}: PlayerInfoProps) {
  if (!player) {
    return (
      <div className={styles.playerInfoContainer}>
        <div className={styles.loadingMessage}>
          Загрузка информации об игроке...
        </div>
      </div>
    )
  }

  // Карты, которые можно раскрыть
  const unrevealedCards = player.cards.filter(card => !card.isRevealed)
  
  // Карты с особыми способностями
  const abilityCards = player.cards.filter(card => card.ability)

  return (
    <div className={styles.playerInfoContainer}>
      <div className={styles.playerHeader}>
        <h2 className={styles.title}>Мой персонаж</h2>
        <div className={styles.statusBadges}>
          {player.isInCapsule && (
            <span className={styles.capsuleBadge}>В капсуле</span>
          )}
          {player.role && (
            <span className={styles.roleBadge}>{player.role}</span>
          )}
        </div>
      </div>

      <div className={styles.cardsSection}>
        <h3 className={styles.sectionTitle}>Мои карты</h3>
        <div className={styles.cardsGrid}>
          {player.cards.map(card => (
            <div 
              key={card.id} 
              className={`${styles.card} ${card.isRevealed ? styles.revealed : ''}`}
              onClick={() => !card.isRevealed && onRevealCard(card.id)}
            >
              <div className={styles.cardHeader}>
                <span className={styles.cardType}>{card.type}</span>
                {card.isRevealed && (
                  <span className={styles.revealedBadge}>Открыта</span>
                )}
              </div>
              <h4 className={styles.cardTitle}>{card.title}</h4>
              <p className={styles.cardDescription}>{card.description}</p>
              
              {card.bonus && (
                <div className={styles.bonus}>+ {card.bonus}</div>
              )}
              {card.penalty && (
                <div className={styles.penalty}>- {card.penalty}</div>
              )}
              
              {!card.isRevealed && gamePhase === 'discussion' && (
                <button 
                  className={styles.revealButton}
                  onClick={() => onRevealCard(card.id)}
                >
                  Раскрыть
                </button>
              )}
              
              {card.ability && (
                <button 
                  className={styles.abilityButton}
                  onClick={() => onUseAbility(card.id)}
                >
                  Использовать способность
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {unrevealedCards.length > 0 && gamePhase === 'discussion' && (
        <div className={styles.revealPrompt}>
          <p>Вам нужно раскрыть 1 карту для обсуждения</p>
          <div className={styles.revealOptions}>
            {unrevealedCards.slice(0, 2).map(card => (
              <button
                key={card.id}
                className={styles.revealOption}
                onClick={() => onRevealCard(card.id)}
              >
                Раскрыть: {card.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {abilityCards.length > 0 && (
        <div className={styles.abilitiesSection}>
          <h3 className={styles.sectionTitle}>Доступные способности</h3>
          <div className={styles.abilitiesList}>
            {abilityCards.map(card => (
              <div key={card.id} className={styles.abilityCard}>
                <h4>{card.title}</h4>
                <p>{card.ability}</p>
                <button 
                  className={styles.useAbilityButton}
                  onClick={() => onUseAbility(card.id)}
                >
                  Использовать
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}