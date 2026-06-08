// apps/web/src/app/game/[gameId]/components/modals/MyCardsModal.tsx
import {
	CardDetails,
	CardType,
	ExtendedGamePlayer,
	ExtendedGameState,
} from '@station-eden/shared'
import { getCardTypeName } from '../utils/game.utils'
import styles from './MyCardsModal.module.css'

interface MyCardsModalProps {
	myCards: Record<string, CardDetails>
	cardsReceivedThisRound: number
	myRevealedCardsThisRound: string[]
	myAllRevealedCards: Record<string, { name: string; type: string }> | string[]
	newCardsThisRound?: CardDetails[]
	gameState: ExtendedGameState | null
	userId?: string
	onClose: () => void
	onRevealCard: (cardType: CardType) => void
}

function isRevealedCardsObject(
	cards: Record<string, { name: string; type: string }> | string[],
): cards is Record<string, { name: string; type: string }> {
	return cards && typeof cards === 'object' && !Array.isArray(cards)
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
	onRevealCard,
}: MyCardsModalProps) {
	const isNewCard = (card: CardDetails): boolean => {
		return newCardsThisRound.some(newCard => newCard.id === card.id)
	}

	const players = (gameState?.players ?? []) as ExtendedGamePlayer[]
	const currentPlayer = userId ? players.find(p => p.id === userId) : undefined

	const isCardRevealed = (cardType: string): boolean => {
		if (isRevealedCardsObject(myAllRevealedCards)) {
			return !!myAllRevealedCards[cardType]
		}

		return myAllRevealedCards.includes(cardType)
	}

	return (
		<div className={styles.modalOverlay}>
			<section className={styles.modalContent} role='dialog' aria-modal='true'>
				<div className={styles.modalHeader}>
					<div>
						<span className={styles.modalEyebrow}>Личные данные</span>
						<h2>Мои карты</h2>
					</div>

					<button
						type='button'
						className={styles.closeButton}
						onClick={onClose}
						aria-label='Закрыть карты'
					>
						✕
					</button>
				</div>

				<div className={styles.cardsStats}>
					<div>
						<span>Всего карт</span>
						<strong>{Object.keys(myCards).length}</strong>
					</div>

					<div>
						<span>Получено в раунде</span>
						<strong>{cardsReceivedThisRound}</strong>
					</div>

					<div>
						<span>Раскрыто в раунде</span>
						<strong>{myRevealedCardsThisRound.length}/1</strong>
					</div>
				</div>

				<div className={styles.cardsList}>
					{Object.entries(myCards).map(([type, card]) => {
						const isRevealed = isCardRevealed(type)
						const canReveal =
							gameState?.phase === 'discussion' &&
							!!userId &&
							!!currentPlayer?.isAlive &&
							myRevealedCardsThisRound.length < 1 &&
							!isRevealed

						return (
							<CardItem
								key={type}
								type={type as CardType}
								card={card}
								isRevealed={isRevealed}
								isNew={isNewCard(card)}
								canReveal={canReveal}
								onReveal={onRevealCard}
							/>
						)
					})}
				</div>
			</section>
		</div>
	)
}

function CardItem({
	type,
	card,
	isRevealed,
	isNew,
	canReveal,
	onReveal,
}: {
	type: CardType
	card: CardDetails
	isRevealed: boolean
	isNew: boolean
	canReveal: boolean
	onReveal: (cardType: CardType) => void
}) {
	return (
		<article className={`${styles.cardItem} ${isNew ? styles.newCard : ''}`}>
			<div className={styles.cardTopline}>
				<span className={styles.cardType}>{getCardTypeName(type)}</span>
				{isNew && <span className={styles.newBadge}>Новая</span>}
				{isRevealed && <span className={styles.revealedBadge}>Раскрыта</span>}
			</div>

			<h3>{cleanText(card.name)}</h3>

			{card.description && (
				<p className={styles.cardDescription}>{cleanText(card.description)}</p>
			)}

			<div className={styles.cardDetailsGrid}>
				{card.pros && card.pros.length > 0 && (
					<div className={styles.cardDetailsBlock}>
						<strong>Плюсы</strong>
						<ul>
							{card.pros.map((pro: string, i: number) => (
								<li key={i}>{cleanText(pro)}</li>
							))}
						</ul>
					</div>
				)}

				{card.cons && card.cons.length > 0 && (
					<div className={`${styles.cardDetailsBlock} ${styles.cardCons}`}>
						<strong>Риски</strong>
						<ul>
							{card.cons.map((con: string, i: number) => (
								<li key={i}>{cleanText(con)}</li>
							))}
						</ul>
					</div>
				)}
			</div>

			<button
				type='button'
				className={styles.revealButton}
				onClick={() => onReveal(type)}
				disabled={!canReveal}
			>
				{isRevealed ? 'Уже раскрыта' : 'Раскрыть карту'}
			</button>
		</article>
	)
}

function cleanText(value: string): string {
	return value.trim().replace(/[.!?。！？]+$/g, '')
}
