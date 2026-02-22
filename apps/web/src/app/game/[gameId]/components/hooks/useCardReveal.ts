// apps/web/src/app/game/[gameId]/hooks/useCardReveal.ts
import { useState, useEffect } from 'react'
import { RevealedPlayer } from '@station-eden/shared'
import { getCardTypeDisplayName } from '../utils/game.utils'

export function useCardReveal(addToChat: (playerName: string, text: string, isSystem?: boolean, playerId?: string) => void) {
  const [revealingCards, setRevealingCards] = useState<string[]>([])
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({})
  const [currentRevealIndex, setCurrentRevealIndex] = useState<number>(0)
  const [isRevealing, setIsRevealing] = useState<boolean>(false)
  // Используем RevealedPlayer | null для начального состояния
  const [revealedPlayer, setRevealedPlayer] = useState<RevealedPlayer | null>(null)

  useEffect(() => {
    if (!isRevealing || revealingCards.length === 0) return

    const timer = setTimeout(() => {
      if (currentRevealIndex < revealingCards.length) {
        const currentCard = revealingCards[currentRevealIndex]
        setRevealedCards(prev => ({
          ...prev,
          [currentCard]: true,
        }))

        setCurrentRevealIndex(prev => prev + 1)

        addToChat(
          'Система',
          `${revealedPlayer?.name || 'Игрок'} раскрывает карту: ${getCardTypeDisplayName(currentCard)}`,
          true,
        )
      } else {
        setIsRevealing(false)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [isRevealing, currentRevealIndex, revealingCards, revealedPlayer?.name, addToChat])

  const startReveal = (player: RevealedPlayer, cardTypes: string[]) => {
    setRevealedPlayer(player)
    setRevealingCards(cardTypes)
    setRevealedCards({})
    setCurrentRevealIndex(0)
    setIsRevealing(true)
  }

  const resetReveal = () => {
    setRevealedPlayer(null)
    setIsRevealing(false)
    setRevealingCards([])
    setRevealedCards({})
    setCurrentRevealIndex(0)
  }

  return {
    revealingCards,
    revealedCards,
    currentRevealIndex,
    isRevealing,
    revealedPlayer,
    setRevealedPlayer,
    startReveal,
    resetReveal,
  }
}