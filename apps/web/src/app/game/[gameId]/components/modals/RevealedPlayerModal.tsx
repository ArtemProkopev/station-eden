// apps/web/src/app/game/[gameId]/components/modals/RevealedPlayerModal.tsx
import { RevealedPlayer } from '@station-eden/shared'
import { getCardTypeDisplayName } from '../utils/game.utils'
import styles from './GameModal.module.css'

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
	onClose,
}: RevealedPlayerModalProps) {
	return (
		<div className={styles.modalOverlay}>
			<section className={styles.modalContent} role='dialog' aria-modal='true'>
				<div className={styles.modalHeader}>
					<div>
						<span className={styles.modalEyebrow}>Раскрытие данных</span>

						<h2>{revealedPlayer?.name || 'Игрок'}</h2>

						<p>
							{isRevealing
								? `Открывается карта ${currentRevealIndex + 1} из ${revealingCards.length}`
								: 'Все карты раскрыты'}
						</p>
					</div>

					<button
						type='button'
						className={styles.closeButton}
						onClick={onClose}
						disabled={isRevealing}
						aria-label='Закрыть раскрытие карт'
					>
						✕
					</button>
				</div>

				<div className={styles.modalBody}>
					{revealedPlayer?.cards && (
						<div className={styles.cardsGrid}>
							{Object.entries(revealedPlayer.cards).map(([type, card]) => {
								if (!card) return null

								const isRevealed = Boolean(revealedCards[type])
								const cardName = cleanText(card.name) || 'Неизвестная карта'
								const cardDescription = cleanText(card.description)

								return (
									<article
										key={type}
										className={`${styles.revealCard} ${
											isRevealed ? '' : styles.revealCardHidden
										}`}
									>
										{isRevealed ? (
											<>
												<span className={styles.revealCardType}>
													{getCardTypeDisplayName(type)}
												</span>

												<h3>{cardName}</h3>

												{cardDescription && <p>{cardDescription}</p>}

												<div className={styles.infoGrid}>
													<InfoList title='Плюсы' items={card.pros} />

													<InfoList title='Риски' items={card.cons} danger />
												</div>
											</>
										) : (
											<span className={styles.hiddenText}>Скрыто</span>
										)}
									</article>
								)
							})}
						</div>
					)}
				</div>
			</section>
		</div>
	)
}

function InfoList({
	title,
	items,
	danger = false,
}: {
	title: string
	items?: string[]
	danger?: boolean
}) {
	if (!items || items.length === 0) return null

	return (
		<div
			className={`${styles.infoBlock} ${danger ? styles.infoBlockDanger : ''}`}
		>
			<strong>{title}</strong>

			<ul>
				{items.map((item, index) => (
					<li key={index}>{cleanText(item)}</li>
				))}
			</ul>
		</div>
	)
}

function cleanText(value?: string | null): string {
	return (value ?? '').trim().replace(/[.!?。！？]+$/g, '')
}
