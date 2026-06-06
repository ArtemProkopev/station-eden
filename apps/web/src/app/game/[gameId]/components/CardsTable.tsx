// apps/web/src/app/game/[gameId]/components/CardsTable.tsx
import { CardDetails, PlayerCardInfo } from '@station-eden/shared'
import styles from '../page.module.css'
import { getCardTypeDisplayName } from './utils/game.utils'

interface CardsTableProps {
	allPlayersCards: PlayerCardInfo[]
	myCards: Record<string, CardDetails>
	userId?: string
}

const ALL_CARD_TYPES = [
	'profession',
	'gender',
	'age',
	'body',
	'health',
	'trait',
	'secret',
	'resource',
	'role',
] as const

export default function CardsTable({
	allPlayersCards,
	userId,
}: CardsTableProps) {
	if (allPlayersCards.length === 0) {
		return (
			<div className={styles.cardsTableContainer}>
				<div className={styles.cardsTableHeader}>
					<h3>Общая таблица карт</h3>
					<p className={styles.tableHint}>Ожидание игроков</p>
				</div>
			</div>
		)
	}

	return (
		<div className={styles.cardsTableContainer}>
			<div className={styles.cardsTableHeader}>
				<h3>Общая таблица карт</h3>
				<p className={styles.tableHint}>
					Раскрытые карты игроков
				</p>
			</div>

			<div className={styles.cardsTable}>
				<table className={styles.cardsTableContent}>
					<thead>
						<tr>
							<th className={styles.playerColumn}>Игрок</th>
							{ALL_CARD_TYPES.map(cardType => (
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

								{ALL_CARD_TYPES.map(cardType => {
									const revealedCard = player.revealedCards[cardType]

									return (
										<td key={cardType} className={styles.cardCell}>
											{revealedCard ? (
												<div className={styles.revealedCardCell}>
													<strong>{revealedCard.name}</strong>
													<span className={styles.cardTypeHint}>
														{getCardTypeDisplayName(revealedCard.type)}
													</span>
												</div>
											) : (
												<span className={styles.hiddenCardCell}>—</span>
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
					<span className={styles.legendSymbol}>—</span>
					<span className={styles.legendText}>Не раскрыта</span>
				</div>
				<div className={styles.legendItem}>
					<div className={styles.legendPlayerIndicator}></div>
					<span className={styles.legendText}>Вы</span>
				</div>
			</div>
		</div>
	)
}