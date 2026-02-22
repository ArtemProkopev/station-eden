// apps/web/src/app/game/[gameId]/components/modals/MyCardsModal.tsx
import { CardDetails, CardType, ExtendedGameState } from '@station-eden/shared'
import { getCardTypeName } from '../utils/game.utils'
import styles from '../../page.module.css'

interface MyCardsModalProps {
  myCards: Record<string, CardDetails>
  cardsReceivedThisRound: number
  myRevealedCardsThisRound: string[]
  myAllRevealedCards: Record<string, { name: string; type: string }>
  newCardsThisRound?: CardDetails[]
  gameState: ExtendedGameState | null
  userId?: string
  onClose: () => void
  onRevealCard: (cardType: CardType) => void
}

export default function MyCardsModal({ 
  myCards, 
  cardsReceivedThisRound, 
  myRevealedCardsThisRound, 
  myAllRevealedCards, 
  newCardsThisRound = [],
  gameState, 
  userId, 
  onClose, 
  onRevealCard 
}: MyCardsModalProps) {
  
  // Проверяем, является ли карта новой в этом раунде
  const isNewCard = (card: CardDetails): boolean => {
    return newCardsThisRound.some(newCard => newCard.id === card.id)
  }

  // Приводим players к ExtendedGamePlayer[] для проверки isAlive
  const currentPlayer = userId && gameState?.players 
    ? (gameState.players as any[]).find(p => p.id === userId)
    : undefined

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Ваши карты</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.cardsInfo}>
          <p>
            <strong>Всего карт:</strong> {Object.keys(myCards).length}
          </p>
          <p>
            <strong>В этом раунде получено:</strong> {cardsReceivedThisRound} карт
          </p>
          <p>
            <strong>Раскрыто в этом раунде:</strong> {myRevealedCardsThisRound.length}/1
          </p>
          {myRevealedCardsThisRound.length >= 1 && (
            <p className={styles.warningText}>
              ⚠️ Вы уже раскрыли карту в этом раунде!
            </p>
          )}
          {cardsReceivedThisRound === 0 && gameState?.phase === 'preparation' && (
            <p className={styles.waitingText}>
              ⏳ Ожидание выдачи карт...
            </p>
          )}
        </div>

        <div className={styles.cardsGrid}>
          {Object.entries(myCards).map(([type, card]) => (
            <CardItem
              key={type}
              type={type as CardType}
              card={card}
              isRevealed={!!myAllRevealedCards[type]}
              isNew={isNewCard(card)}
              myRevealedCardsThisRound={myRevealedCardsThisRound}
              canReveal={
                gameState?.phase === 'discussion' &&
                !!userId &&
                !!currentPlayer?.isAlive &&
                myRevealedCardsThisRound.length < 1 &&
                !myAllRevealedCards[type]
              }
              onReveal={onRevealCard}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface CardItemProps {
  type: CardType
  card: CardDetails
  isRevealed: boolean
  isNew: boolean
  myRevealedCardsThisRound: string[]
  canReveal: boolean
  onReveal: (cardType: CardType) => void
}

function CardItem({ type, card, isRevealed, isNew, myRevealedCardsThisRound, canReveal, onReveal }: CardItemProps) {
  return (
    <div className={`${styles.cardItem} ${isNew ? styles.newCard : ''}`}>
      <div className={styles.cardHeader}>
        <h3>{getCardTypeName(type)}</h3>
        {isNew && <span className={styles.newCardBadge}>Новая</span>}
      </div>
      <h4>{card.name}</h4>
      <p>{card.description}</p>

      {card.pros && card.pros.length > 0 && (
        <div className={styles.cardPros}>
          <strong>Плюсы:</strong>
          <ul>
            {card.pros.map((pro, i) => <li key={i}>{pro}</li>)}
          </ul>
        </div>
      )}

      {card.cons && card.cons.length > 0 && (
        <div className={styles.cardCons}>
          <strong>Минусы:</strong>
          <ul>
            {card.cons.map((con, i) => <li key={i}>{con}</li>)}
          </ul>
        </div>
      )}

      {card.effects && card.effects.length > 0 && (
        <div className={styles.cardEffects}>
          <strong>Эффекты:</strong>
          <ul>
            {card.effects.map((effect, i) => <li key={i}>{effect}</li>)}
          </ul>
        </div>
      )}

      {card.goal && (
        <div className={styles.cardGoal}>
          <strong>Цель:</strong>
          <p>{card.goal}</p>
        </div>
      )}

      {card.abilities && card.abilities.length > 0 && (
        <div className={styles.cardAbilities}>
          <strong>Способности:</strong>
          <ul>
            {card.abilities.map((ability, i) => <li key={i}>{ability}</li>)}
          </ul>
        </div>
      )}

      {card.bonuses && card.bonuses.length > 0 && (
        <div className={styles.cardBonuses}>
          <strong>Бонусы:</strong>
          <ul>
            {card.bonuses.map((bonus, i) => <li key={i}>{bonus}</li>)}
          </ul>
        </div>
      )}

      {card.specialAbility && (
        <div className={styles.cardSpecial}>
          <strong>Особая способность:</strong>
          <p>{card.specialAbility}</p>
        </div>
      )}

      <button
        className={styles.revealButton}
        onClick={() => onReveal(type)}
        disabled={!canReveal}
      >
        {isRevealed
          ? 'Уже раскрыта'
          : myRevealedCardsThisRound.length >= 1
            ? 'Лимит раскрытий'
            : 'Раскрыть карту'}
      </button>
    </div>
  )
}