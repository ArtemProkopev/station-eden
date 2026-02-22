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
	myAllRevealedCards: Record<string, { name: string; type: string }>
	newCardsThisRound?: CardDetails[]
	gameState: ExtendedGameState | null
	userId?: string
	onClose: () => void
	onRevealCard: (cardType: CardType) => void
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

	// В ExtendedGameState.players по типам это GamePlayer[]
	// но по факту в режиме игры у тебя там ExtendedGamePlayer (с isAlive).
	// Поэтому безопасно (без any) приводим к массиву ExtendedGamePlayer и берём текущего.
	const players = (gameState?.players ?? []) as ExtendedGamePlayer[]

	const currentPlayer = userId ? players.find(p => p.id === userId) : undefined

	return (
		<div className={styles.modalOverlay}>
			<div className={styles.modalContent}>
				<h2>Ваши карты</h2>
				<button onClick={onClose}>✕</button>

				<div>
					<p>Всего карт: {Object.keys(myCards).length}</p>
					<p>В этом раунде получено: {cardsReceivedThisRound}</p>
					<p>Раскрыто в этом раунде: {myRevealedCardsThisRound.length}/1</p>
				</div>

				<div>
					{Object.entries(myCards).map(([type, card]) => (
						<CardItem
							key={type}
							type={type as CardType}
							card={card}
							isRevealed={!!myAllRevealedCards[type]}
							isNew={isNewCard(card)}
							myRevealedCardsThisRound={myRevealedCardsThisRound}
							canReveal={
								gameState?.phase === 'discussion' &&
								!!userId &&
								!!currentPlayer?.isAlive &&
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

function CardItem({
	type,
	card,
	isRevealed,
	isNew,
	myRevealedCardsThisRound,
	canReveal,
	onReveal,
}: {
	type: CardType
	card: CardDetails
	isRevealed: boolean
	isNew: boolean
	myRevealedCardsThisRound: string[]
	canReveal: boolean
	onReveal: (cardType: CardType) => void
}) {
	return (
		<div className={`${styles.cardItem} ${isNew ? styles.newCard : ''}`}>
			<h3>{getCardTypeName(type)}</h3>
			{isNew && <span>Новая</span>}

			<h4>{card.name}</h4>
			<p>{card.description}</p>

			{card.pros?.map((pro: string, i: number) => (
				<p key={i}>{pro}</p>
			))}

			{card.cons?.map((con: string, i: number) => (
				<p key={i}>{con}</p>
			))}

			<button onClick={() => onReveal(type)} disabled={!canReveal}>
				{isRevealed
					? 'Уже раскрыта'
					: myRevealedCardsThisRound.length >= 1
						? 'Лимит раскрытий'
						: 'Раскрыть карту'}
			</button>
		</div>
	)
}
