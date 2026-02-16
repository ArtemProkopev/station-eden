// apps/web/src/app/game/[gameId]/components/modals/MyCardsModal.tsx
import { CardDetails, CardType, GameState } from '../types/game.types'
import { getCardTypeName } from '../utils/game.utils'
import styles from '../../page.module.css'

interface MyCardsModalProps {
  myCards: Record<string, CardDetails>
  cardsReceivedThisRound: number
  myRevealedCardsThisRound: string[]
  myAllRevealedCards: Record<string, { name: string; type: string }>
  gameState: GameState | null
  userId?: string
  onClose: () => void
  onRevealCard: (cardType: CardType) => void
}

export default function MyCardsModal({ 
  myCards, 
  cardsReceivedThisRound, 
  myRevealedCardsThisRound, 
  myAllRevealedCards, 
  gameState, 
  userId, 
  onClose, 
  onRevealCard 
}: MyCardsModalProps) {
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
            В этом раунде вы получили: <strong>{cardsReceivedThisRound} карт</strong>
          </p>
          <p>
            Раскрыто в этом раунде: <strong>{myRevealedCardsThisRound.length} карт</strong>
          </p>
          {myRevealedCardsThisRound.length >= 1 && (
            <p className={styles.warningText}>
              Вы уже раскрыли карту в этом раунде!
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
              myRevealedCardsThisRound={myRevealedCardsThisRound}
              canReveal={
                gameState?.phase === 'discussion' &&
                !!userId &&
                !!gameState?.players?.find(p => p.id === userId)?.isAlive &&
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
  myRevealedCardsThisRound: string[]
  canReveal: boolean
  onReveal: (cardType: CardType) => void
}

function CardItem({ type, card, isRevealed, myRevealedCardsThisRound, canReveal, onReveal }: CardItemProps) {
  return (
    <div className={styles.cardItem}>
      <h3>{getCardTypeName(type)}</h3>
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