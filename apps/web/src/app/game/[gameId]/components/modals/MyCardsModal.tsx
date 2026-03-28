// apps/web/src/app/game/[gameId]/components/modals/MyCardsModal.tsx
import {
	CardDetails,
	CardType,
	ExtendedGamePlayer,
	ExtendedGameState,
} from '@station-eden/shared'
import styles from '../../page.module.css'
import { getCardTypeName } from '../utils/game.utils'

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

// Type guard для проверки типа myAllRevealedCards
function isRevealedCardsObject(
	cards: Record<string, { name: string; type: string }> | string[]
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

	// Нормализация myAllRevealedCards для проверки
	const isCardRevealed = (cardType: string): boolean => {
		if (isRevealedCardsObject(myAllRevealedCards)) {
			return !!myAllRevealedCards[cardType]
		}
		return myAllRevealedCards.includes(cardType)
	}

	return (
		<div className={styles.modalOverlay}>
			<div className={styles.modalContent}>
				<div className={styles.modalHeader}>
					<h2>Ваши карты</h2>
					<button className={styles.closeButton} onClick={onClose}>✕</button>
				</div>

				<div className={styles.cardsStats}>
					<p>Всего карт: {Object.keys(myCards).length}</p>
					<p>В этом раунде получено: {cardsReceivedThisRound}</p>
					<p>Раскрыто в этом раунде: {myRevealedCardsThisRound.length}/1</p>
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
			</div>
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
		<div className={`${styles.cardItem} ${isNew ? styles.newCard : ''}`}>
			<h3>{getCardTypeName(type)}</h3>
			{isNew && <span className={styles.newBadge}>Новая</span>}

			<h4>{card.name}</h4>
			<p>{card.description}</p>

			{card.pros && card.pros.length > 0 && (
				<div className={styles.cardPros}>
					<strong>Преимущества:</strong>
					<ul>
						{card.pros.map((pro: string, i: number) => (
							<li key={i}>{pro}</li>
						))}
					</ul>
				</div>
			)}

			{card.cons && card.cons.length > 0 && (
				<div className={styles.cardCons}>
					<strong>Недостатки:</strong>
					<ul>
						{card.cons.map((con: string, i: number) => (
							<li key={i}>{con}</li>
						))}
					</ul>
				</div>
			)}

			<button 
				className={styles.revealButton}
				onClick={() => onReveal(type)} 
				disabled={!canReveal}
			>
				{isRevealed
					? 'Уже раскрыта'
					: 'Раскрыть карту'}
			</button>
		</div>
	)
}