// apps/web/src/app/game/[gameId]/components/CardsTable.tsx
'use client'

import { CardDetails, PlayerCardInfo } from '@station-eden/shared'
import { useMemo, useState } from 'react'
import styles from './CardsTable.module.css'
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
	cardType: string
	card: CardDetails
}

export default function CardsTable({
	allPlayersCards,
	userId,
}: CardsTableProps) {
	const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null)

	const revealedTotal = useMemo(() => {
		return allPlayersCards.reduce((total, player) => {
			return (
				total + Object.values(player.revealedCards || {}).filter(Boolean).length
			)
		}, 0)
	}, [allPlayersCards])

	const totalSlots = allPlayersCards.length * ALL_CARD_TYPES.length

	const handleCardClick = (
		playerName: string,
		cardType: string,
		card: CardDetails,
	) => {
		setSelectedCard({ playerName, cardType, card })
	}

	if (allPlayersCards.length === 0) {
		return (
			<div className={styles.cardsTableContainer}>
				<div className={styles.cardsTableHeader}>
					<h3>Раскрытые карты</h3>
					<p>Ожидание раскрытия данных экипажа</p>
				</div>
			</div>
		)
	}

	return (
		<>
			<div className={styles.cardsTableContainer}>
				<div className={styles.cardsTableHeader}>
					<h3>Раскрытые карты</h3>

					<div className={styles.tableStats}>
						<span>Открыто</span>
						<strong>
							{revealedTotal}/{totalSlots}
						</strong>
					</div>
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
							{allPlayersCards.map((player, index) => {
								const revealedCount = Object.values(
									player.revealedCards || {},
								).filter(Boolean).length

								return (
									<tr
										key={player.playerId}
										className={
											player.playerId === userId ? styles.currentPlayerRow : ''
										}
									>
										<td className={styles.playerCell}>
											<div className={styles.playerCellInner}>
												<span className={styles.playerIndex}>
													{String(index + 1).padStart(2, '0')}
												</span>

												<div className={styles.playerCellText}>
													<span className={styles.playerNameCell}>
														{player.playerName}
													</span>

													<div className={styles.playerCellMeta}>
														{player.playerId === userId && (
															<span className={styles.youBadge}>Вы</span>
														)}

														<span>{revealedCount} открыто</span>
													</div>
												</div>
											</div>
										</td>

										{ALL_CARD_TYPES.map(cardType => {
											const revealedCard = player.revealedCards?.[cardType]

											return (
												<td key={cardType} className={styles.cardCell}>
													{revealedCard ? (
														<button
															type='button'
															className={styles.revealedCardCell}
															onClick={() =>
																handleCardClick(
																	player.playerName,
																	cardType,
																	revealedCard,
																)
															}
															title='Открыть подробности карты'
														>
															<strong>{cleanText(revealedCard.name)}</strong>
															<span>
																{getCardTypeDisplayName(
																	revealedCard.type || cardType,
																)}
															</span>
														</button>
													) : (
														<span className={styles.hiddenCardCell}>
															<span />
														</span>
													)}
												</td>
											)
										})}
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>

				<div className={styles.cardsTableLegend}>
					<div className={styles.legendItem}>
						<span className={styles.legendClosed} />
						<span>Не раскрыта</span>
					</div>

					<div className={styles.legendItem}>
						<span className={styles.legendOpened} />
						<span>Раскрыта</span>
					</div>

					<div className={styles.legendItem}>
						<span className={styles.legendCurrent} />
						<span>Ваш игрок</span>
					</div>
				</div>
			</div>

			{selectedCard && (
				<CardDetailsModal
					selectedCard={selectedCard}
					onClose={() => setSelectedCard(null)}
				/>
			)}
		</>
	)
}

function CardDetailsModal({
	selectedCard,
	onClose,
}: {
	selectedCard: SelectedCard
	onClose: () => void
}) {
	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<section
				className={styles.modalContent}
				role='dialog'
				aria-modal='true'
				onClick={event => event.stopPropagation()}
			>
				<div className={styles.modalHeader}>
					<div>
						<span className={styles.modalEyebrow}>
							{getCardTypeDisplayName(
								selectedCard.card.type || selectedCard.cardType,
							)}
						</span>

						<h2>{cleanText(selectedCard.card.name)}</h2>

						<p>Игрок: {selectedCard.playerName}</p>
					</div>

					<button
						type='button'
						className={styles.closeButton}
						onClick={onClose}
						aria-label='Закрыть карту'
					>
						✕
					</button>
				</div>

				<div className={styles.cardDetails}>
					{selectedCard.card.description && (
						<p className={styles.cardDescription}>
							{cleanText(selectedCard.card.description)}
						</p>
					)}

					{selectedCard.card.effects &&
						selectedCard.card.effects.length > 0 && (
							<div className={styles.cardEffects}>
								<h3>Эффекты</h3>
								<ul>
									{selectedCard.card.effects.map(effect => (
										<li key={effect}>{cleanText(effect)}</li>
									))}
								</ul>
							</div>
						)}
				</div>
			</section>
		</div>
	)
}

function cleanText(value?: string): string {
	if (!value) return ''

	return value.trim().replace(/[.!?。！？]+$/g, '')
}
