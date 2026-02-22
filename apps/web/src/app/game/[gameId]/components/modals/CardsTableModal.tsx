// apps/web/src/app/game/[gameId]/components/modals/CardsTableModal.tsx
import { PlayerCardInfo, CardDetails } from '@station-eden/shared'
import { getCardTypeDisplayName } from '../utils/game.utils'
import styles from '../../page.module.css'

interface CardsTableModalProps {
  allPlayersCards: PlayerCardInfo[]
  myCards: Record<string, CardDetails>
  userId?: string
  onClose: () => void
}

export default function CardsTableModal({ allPlayersCards, myCards, userId, onClose }: CardsTableModalProps) {
  const allCardTypes = Object.keys(myCards)

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Общая таблица карт</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.cardsTableContainer}>
          <div className={styles.cardsTableHeader}>
            <h3>Раскрытые карты игроков</h3>
            <p className={styles.tableHint}>
              Здесь отображаются карты, которые игроки раскрыли в течение игры
            </p>
          </div>

          <div className={styles.cardsTable}>
            <table className={styles.cardsTableContent}>
              <thead>
                <tr>
                  <th className={styles.playerColumn}>Игрок</th>
                  {allCardTypes.map(cardType => (
                    <th key={cardType} className={styles.cardTypeColumn}>
                      {getCardTypeDisplayName(cardType)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPlayersCards.map(player => (
                  <tr
                    key={player.playerId}
                    className={
                      player.playerId === userId ? styles.currentPlayerRow : ''
                    }
                  >
                    <td className={styles.playerCell}>
                      <span className={styles.playerNameCell}>
                        {player.playerName}
                        {player.playerId === userId && ' (Вы)'}
                      </span>
                    </td>
                    {allCardTypes.map(cardType => (
                      <td key={cardType} className={styles.cardCell}>
                        {player.revealedCards[cardType] ? (
                          <div className={styles.revealedCardCell}>
                            <strong>{player.revealedCards[cardType].name}</strong>
                            <span className={styles.cardTypeHint}>
                              {player.revealedCards[cardType].type}
                            </span>
                          </div>
                        ) : (
                          <span className={styles.hiddenCardCell}>❓</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.cardsTableLegend}>
            <div className={styles.legendItem}>
              <span className={styles.legendSymbol}>❓</span>
              <span className={styles.legendText}>Карта не раскрыта</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendPlayerIndicator}></div>
              <span className={styles.legendText}>Текущий игрок</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}