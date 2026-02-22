// apps/web/src/app/game/[gameId]/components/modals/RevealedPlayerModal.tsx
import { RevealedPlayer, CardDetails } from '@station-eden/shared'
import { getCardTypeDisplayName } from '../utils/game.utils'
import styles from '../../page.module.css'

interface RevealedPlayerModalProps {
  revealedPlayer: RevealedPlayer
  revealedCards: Record<string, boolean>
  revealingCards: string[]
  currentRevealIndex: number
  isRevealing: boolean
  onClose: () => void
}

export default function RevealedPlayerModal({ 
  revealedPlayer, 
  revealedCards, 
  revealingCards, 
  currentRevealIndex, 
  isRevealing, 
  onClose 
}: RevealedPlayerModalProps) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Карты выбывшего игрока: {revealedPlayer?.name}</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            disabled={isRevealing}
          >
            ✕
          </button>
        </div>

        <div className={styles.revealProgress}>
          {isRevealing ? (
            <div className={styles.revealingStatus}>
              <div className={styles.revealSpinner}></div>
              <p>
                Раскрытие карты {currentRevealIndex + 1} из {revealingCards.length}...
              </p>
            </div>
          ) : (
            <div className={styles.revealComplete}>
              <p>✅ Все карты раскрыты</p>
            </div>
          )}
        </div>

        {revealedPlayer?.cards && (
          <div className={styles.cardsGrid}>
            {Object.entries(revealedPlayer.cards).map(([type, card]) =>
              card ? (
                <div
                  key={type}
                  className={`${styles.cardItem} ${styles.revealCard} ${
                    revealedCards[type] ? styles.revealed : styles.hidden
                  }`}
                >
                  <div className={styles.cardHeader}>
                    <h3>{getCardTypeDisplayName(type)}</h3>
                    {!revealedCards[type] && (
                      <div className={styles.cardBack}>
                        <span className={styles.cardBackText}>Скрыто</span>
                      </div>
                    )}
                  </div>

                  {revealedCards[type] && (
                    <div className={styles.cardContent}>
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
                    </div>
                  )}
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  )
}