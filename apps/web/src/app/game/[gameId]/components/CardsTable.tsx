// apps/web/src/app/game/[gameId]/components/CardsTable.tsx
'use client'

import { CardDetails, PlayerCardInfo } from '@station-eden/shared'
import { useState } from 'react'
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

interface SelectedCard {
	playerName: string
	card: {
		name: string
		type: string
		description?: string
		pros?: string[]
		cons?: string[]
		effects?: string[]
		goal?: string
		abilities?: string[]
		bonuses?: string[]
		specialAbility?: string
	}
}

export default function CardsTable({
	allPlayersCards,
	userId,
}: CardsTableProps) {
	const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null)

	const handleCardClick = (playerName: string, card: SelectedCard['card']) => {
		setSelectedCard({ playerName, card })
	}

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
		<>
			<div className={styles.cardsTableContainer}>
				<div className={styles.cardsTableHeader}>
					<h3>Общая таблица карт</h3>
					<p className={styles.tableHint}>
						Нажмите на раскрытую карту для просмотра деталей
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
											{player.playerId === userId && ' - Вы'}
										</span>
									</td>

									{ALL_CARD_TYPES.map(cardType => {
										const revealedCard = player.revealedCards[cardType]

										return (
											<td key={cardType} className={styles.cardCell}>
												{revealedCard ? (
													<div 
														className={styles.revealedCardCell}
														onClick={() => handleCardClick(player.playerName, revealedCard)}
														onKeyDown={(e) => e.key === 'Enter' && handleCardClick(player.playerName, revealedCard)}
														role="button"
														tabIndex={0}
														style={{ cursor: 'pointer' }}
														title="Нажмите для просмотра деталей"
													>
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
					<div className={styles.legendItem}>
						<span className={styles.legendSymbol}>i</span>
						<span className={styles.legendText}>Нажмите на карту для деталей</span>
					</div>
				</div>
			</div>

			{/* Модальное окно с деталями карты */}
			{selectedCard && (
				<div className={styles.modalOverlay} onClick={() => setSelectedCard(null)}>
					<div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
						<div className={styles.modalHeader}>
							<h2>Карта игрока {selectedCard.playerName}</h2>
							<button className={styles.closeButton} onClick={() => setSelectedCard(null)}>
								✕
							</button>
						</div>
						
						<div className={styles.cardItem}>
							<h3>{getCardTypeDisplayName(selectedCard.card.type)}</h3>
							<h4>{selectedCard.card.name}</h4>
							<p>{selectedCard.card.description || 'Описание отсутствует'}</p>

							{selectedCard.card.pros && selectedCard.card.pros.length > 0 && (
								<div className={styles.cardPros}>
									<strong>Преимущества:</strong>
									<ul>
										{selectedCard.card.pros.map((pro: string, i: number) => (
											<li key={i}>{pro}</li>
										))}
									</ul>
								</div>
							)}

							{selectedCard.card.cons && selectedCard.card.cons.length > 0 && (
								<div className={styles.cardCons}>
									<strong>Недостатки:</strong>
									<ul>
										{selectedCard.card.cons.map((con: string, i: number) => (
											<li key={i}>{con}</li>
										))}
									</ul>
								</div>
							)}

							{selectedCard.card.effects && selectedCard.card.effects.length > 0 && (
								<div className={styles.cardEffects}>
									<strong>Эффекты:</strong>
									<ul>
										{selectedCard.card.effects.map((effect: string, i: number) => (
											<li key={i}>{effect}</li>
										))}
									</ul>
								</div>
							)}

							{selectedCard.card.goal && (
								<div className={styles.cardGoal}>
									<strong>Цель:</strong> {selectedCard.card.goal}
								</div>
							)}

							{selectedCard.card.specialAbility && (
								<div className={styles.cardSpecialAbility}>
									<strong>Особая способность:</strong> {selectedCard.card.specialAbility}
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	)
}