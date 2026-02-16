// apps/web/src/app/game/[gameId]/hooks/useGameChat.ts
import { useState, useCallback, useRef, useEffect } from 'react'
import { GameChatMessage } from '../types/game.types'

export function useGameChat() {
  const [chatMessages, setChatMessages] = useState<GameChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const addToChat = useCallback(
    (playerName: string, text: string, isSystem: boolean = false, playerId?: string) => {
      const newChatMessage: GameChatMessage = {
        id: Date.now().toString() + Math.random(),
        playerId: playerId || (isSystem ? 'system' : 'player'),
        playerName,
        text,
        type: isSystem ? 'system' : 'player',
        timestamp: new Date(),
      }

      setChatMessages(prev => [...prev.slice(-50), newChatMessage])
    },
    [],
  )

  const handleMessageChange = useCallback((message: string) => {
    setNewMessage(message.slice(0, 300))
  }, [])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages])

  return {
    chatMessages,
    newMessage,
    chatContainerRef,
    addToChat,
    setChatMessages,
    handleMessageChange,
    setNewMessage,
  }
}