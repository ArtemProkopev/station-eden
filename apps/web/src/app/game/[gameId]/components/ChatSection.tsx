// apps/web/src/app/game/[gameId]/components/ChatSection.tsx
import { RefObject } from 'react'
import { GameChatMessage } from './types/game.types'
import { formatMessageTime } from './utils/game.utils'
import styles from '../page.module.css'

interface ChatSectionProps {
  chatMessages: GameChatMessage[]
  newMessage: string
  chatContainerRef: RefObject<HTMLDivElement>
  isConnected: boolean
  gameState: any
  profile: any
  userId?: string
  onMessageChange: (message: string) => void
  onSendMessage: (e?: React.FormEvent) => void
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export default function ChatSection({
  chatMessages,
  newMessage,
  chatContainerRef,
  isConnected,
  gameState,
  profile,
  userId,
  onMessageChange,
  onSendMessage,
  onKeyPress
}: ChatSectionProps) {
  return (
    <div className={styles.chatSection}>
      <div className={styles.chatHeader}>
        <h3>Чат обсуждения</h3>
        <div className={styles.chatStatus}>
          {isConnected ? 'Онлайн' : 'Офлайн'}
        </div>
      </div>

      <div className={styles.chatMessages} ref={chatContainerRef}>
        {chatMessages.length === 0 ? (
          <div className={styles.emptyChat}>
            <p>Сообщений пока нет</p>
            <p className={styles.emptyHint}>Начните общение первым!</p>
          </div>
        ) : (
          chatMessages.map(message => (
            <ChatMessage 
              key={message.id} 
              message={message} 
              userId={userId}
            />
          ))
        )}
      </div>

      <form onSubmit={onSendMessage} className={styles.chatForm}>
        <input
          type='text'
          value={newMessage}
          onChange={e => onMessageChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={
            !isConnected ? 'Нет подключения...' : 'Введите сообщение...'
          }
          disabled={
            !isConnected ||
            !gameState ||
            gameState.phase === 'game_over' ||
            profile.status !== 'ok'
          }
          className={styles.chatInput}
          maxLength={300}
        />
        <button
          type='submit'
          className={styles.sendButton}
          disabled={
            !newMessage.trim() ||
            !isConnected ||
            !gameState ||
            gameState.phase === 'game_over' ||
            profile.status !== 'ok'
          }
        >
          Отправить
        </button>
      </form>
    </div>
  )
}

interface ChatMessageProps {
  message: GameChatMessage
  userId?: string
}

function ChatMessage({ message, userId }: ChatMessageProps) {
  return (
    <div
      className={`${styles.message} ${
        message.type === 'system' ? styles.systemMessage : ''
      } ${userId && message.playerId === userId ? styles.myMessage : ''}`}
    >
      <div className={styles.messageHeader}>
        <span className={styles.sender}>
          {message.playerName}
        </span>
        <span className={styles.time}>
          {formatMessageTime(message.timestamp)}
        </span>
      </div>
      <div className={styles.messageText}>{message.text}</div>
    </div>
  )
}