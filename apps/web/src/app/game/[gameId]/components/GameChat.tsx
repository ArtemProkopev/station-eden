// apps/web/src/app/game/[gameId]/components/GameChat.tsx
'use client'

import { GameChatMessage } from '@station-eden/shared'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import styles from './GameChat.module.css'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'text' | 'voice'>('text')
  const [hasVoiceActivity, setHasVoiceActivity] = useState(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleVoiceStatsChange = (stats: { participantsCount: number; someoneSpeaking: boolean }) => {
    setHasVoiceActivity(stats.participantsCount > 0)
  }

  return (
    <div className={styles.gameChat}>
      {/* Вкладки */}
      <div className={styles.tabsHeader}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'text' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('text')}
        >
          Текстовый чат
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'voice' ? styles.tabButtonActive : ''} ${hasVoiceActivity ? styles.tabButtonHasVoice : ''}`}
          onClick={() => setActiveTab('voice')}
        >
          Голосовой чат
        </button>
      </div>

      {/* Текстовый чат */}
      {activeTab === 'text' && (
        <>
          <div className={styles.messagesArea} onScroll={onChatScroll}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Сообщений пока нет</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${msg.type === 'system' ? styles.messageSystem : ''} ${msg.playerId === currentUserId ? styles.myMessage : ''}`}
                >
                  <div className={styles.messageHeader}>
                    <span className={styles.messageAuthor}>
                      {msg.type === 'system' ? 'Система' : msg.playerName}
                    </span>
                    <span className={styles.messageTime}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <div className={styles.messageText}>{msg.text}</div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={onSendMessage} className={styles.inputArea}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => onMessageChange(e.target.value.slice(0, 300))}
              onKeyPress={onKeyPress}
              placeholder={disabled ? 'Чат недоступен...' : 'Введите сообщение...'}
              className={styles.input}
              maxLength={300}
              disabled={disabled}
            />
            <button
              type="submit"
              className={styles.sendButton}
              disabled={!newMessage.trim() || disabled}
            >
              →
            </button>
          </form>
        </>
      )}

      {/* Голосовой чат */}
      {activeTab === 'voice' && (
        <div className={styles.voiceTab}>
          <VoicePanelLoader roomId={gameId} onStatsChange={handleVoiceStatsChange} />
        </div>
      )}
    </div>
  )
}

// Компонент-загрузчик для VoicePanel
function VoicePanelLoader({
  roomId,
  onStatsChange,
}: {
  roomId: string
  onStatsChange: (stats: { participantsCount: number; someoneSpeaking: boolean }) => void
}) {
  const [VoicePanelComponent, setVoicePanelComponent] = useState<React.ComponentType<{
    lobbyId: string
    onStatsChange: (stats: { participantsCount: number; someoneSpeaking: boolean }) => void
  }> | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    import('@/app/lobby/components/VoicePanel/VoicePanel')
      .then(module => {
        setVoicePanelComponent(() => module.default)
      })
      .catch(err => {
        console.error('Failed to load VoicePanel:', err)
        setError(true)
      })
  }, [])

  if (error) {
    return <div className={styles.voiceError}>Голосовой чат недоступен</div>
  }

  if (!VoicePanelComponent) {
    return <div className={styles.voiceLoading}>Загрузка голосового чата...</div>
  }

  return <VoicePanelComponent lobbyId={roomId} onStatsChange={onStatsChange} />
}