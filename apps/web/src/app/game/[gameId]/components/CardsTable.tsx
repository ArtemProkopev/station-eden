// apps/web/src/app/game/[gameId]/components/CardsTable.tsx
import { PlayerCardInfo, CardDetails } from '@station-eden/shared'
import { getCardTypeDisplayName } from './utils/game.utils'
import styles from '../page.module.css'

interface CardsTableProps {
  allPlayersCards: PlayerCardInfo[]
  myCards: Record<string, CardDetails>
  userId?: string
}

// ✅ Все возможные типы карт (всегда показываем, даже если не раскрыты)
const ALL_CARD_TYPES = [
  'profession',
  'gender',
  'age',
  'body',
  'health',
  'trait',
  'secret'
] as const

export default function CardsTable({ allPlayersCards, myCards, userId }: CardsTableProps) {
  // Всегда показываем все типы карт
  const allCardTypes = ALL_CARD_TYPES

  if (allPlayersCards.length === 0) {
    return (
      <div className={styles.cardsTableContainer}>
        <div className={styles.cardsTableHeader}>
          <h3>📋 Общая таблица карт</h3>
          <p className={styles.tableHint}>
            Ожидание игроков...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.cardsTableContainer}>
      <div className={styles.cardsTableHeader}>
        <h3>📋 Общая таблица карт</h3>
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
                {allCardTypes.map(cardType => {
                  const revealedCard = player.revealedCards[cardType]
                  return (
                    <td key={cardType} className={styles.cardCell}>
                      {revealedCard ? (
                        <div className={styles.revealedCardCell}>
                          <strong>{revealedCard.name}</strong>
                          <span className={styles.cardTypeHint}>
                            {revealedCard.type}
                          </span>
                        </div>
                      ) : (
                        <span className={styles.hiddenCardCell}>❓</span>
                      )}
                    </td>
                  )
                })}
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
          <span className={styles.legendText}>Вы</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.revealedCardSample}></div>
          <span className={styles.legendText}>Раскрытая карта</span>
        </div>
      </div>
    </div>
  )
}