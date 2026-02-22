// apps/web/src/app/game/[gameId]/components/GameChat.tsx
import Chat from '@/components/shared/Chat/Chat'
import { GameChatMessage } from '@station-eden/shared'
import type React from 'react'

interface GameChatProps {
  gameId: string
  messages: GameChatMessage[]
  newMessage: string
  onMessageChange: (message: string) => void
  onSendMessage: (e: React.FormEvent) => void
  onKeyPress: (e: React.KeyboardEvent<Element>) => void
  onChatScroll: () => void
  disabled?: boolean
  currentUserId?: string
}

export default function GameChat({
  gameId,
  messages,
  newMessage,
  onMessageChange,
  onSendMessage,
  onKeyPress,
  onChatScroll,
  disabled = false,
  currentUserId,
}: GameChatProps) {
  return (
    <Chat
      roomId={gameId}
      messages={messages}
      newMessage={newMessage}
      onMessageChange={onMessageChange}
      onSendMessage={onSendMessage}
      onKeyPress={onKeyPress}
      onChatScroll={onChatScroll}
      showVoiceTab={false}
      disabled={disabled}
      placeholder='Чат обсуждения...'
      currentUserId={currentUserId}
    />
  )
}