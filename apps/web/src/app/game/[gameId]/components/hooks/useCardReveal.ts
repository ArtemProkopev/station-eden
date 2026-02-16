// apps/web/src/app/game/[gameId]/hooks/useCardReveal.ts
import { useState, useEffect } from 'react'
import { RevealedPlayer } from '../types/game.types'

export function useCardReveal(addToChat: (playerName: string, text: string, isSystem?: boolean, playerId?: string) => void) {
  const [revealingCards, setRevealingCards] = useState<string[]>([])
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({})
  const [currentRevealIndex, setCurrentRevealIndex] = useState<number>(0)
  const [isRevealing, setIsRevealing] = useState<boolean>(false)
  const [revealedPlayer, setRevealedPlayer] = useState<RevealedPlayer>(null)

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

// Вспомогательная функция (нужно импортировать или дублировать)
function getCardTypeDisplayName(type: string): string {
  switch (type) {
    case 'profession':
      return 'Профессия'
    case 'health':
      return 'Состояние здоровья'
    case 'trait':
      return 'Психологическая черта'
    case 'secret':
      return 'Секрет'
    case 'role':
      return 'Скрытая роль'
    case 'resource':
      return 'Ресурс'
    case 'gender':
      return 'Пол'
    case 'age':
      return 'Возраст'
    case 'body':
      return 'Телосложение'
    default:
      return type
  }
}