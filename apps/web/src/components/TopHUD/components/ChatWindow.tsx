// apps/web/src/components/TopHUD/components/ChatWindow.tsx
'use client'

import React from 'react'
import styles from './ChatWindow.module.css'

interface ChatWindowProps {
  isOpen: boolean
  onClose: () => void
  friendId: string
  friendName: string
}

export function ChatWindow({ isOpen, onClose, friendId, friendName }: ChatWindowProps) {
  const [message, setMessage] = React.useState('')
  const [messages, setMessages] = React.useState<Array<{id: string, text: string, isOwn: boolean, timestamp: Date}>>([
    {
      id: '1',
      text: 'Привет! Как дела?',
      isOwn: false,
      timestamp: new Date(Date.now() - 300000)
    },
    {
      id: '2', 
      text: 'Привет! Все отлично, спасибо!',
      isOwn: true,
      timestamp: new Date(Date.now() - 240000)
    },
    {
      id: '3',
      text: 'Отлично! Хочешь сыграть вместе?',
      isOwn: false,
      timestamp: new Date(Date.now() - 180000)
    }
  ])

  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Мемоизируем обработчик отправки сообщения
  const handleSendMessage = React.useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        text: message,
        isOwn: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, newMessage])
      setMessage('')
      
      // Имитация ответа друга через 2 секунды
      setTimeout(() => {
        const responses = [
          'Круто!',
          'Интересно...',
          'Давай обсудим это',
          'Я согласен!',
          'Может быть позже?'
        ]
        const randomResponse = responses[Math.floor(Math.random() * responses.length)]
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: randomResponse,
          isOwn: false,
          timestamp: new Date()
        }])
      }, 2000)
    }
  }, [message])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Мемоизируем обработчик закрытия
  const handleClose = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }, [onClose])

  // Мемоизируем обработчик изменения input
  const handleMessageChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
  }, [])

  if (!isOpen) return null

  return (
    <div 
      className={styles.chatWindow}
      data-chat-window="true"
    >
      <div className={styles.chatHeader}>
        <div className={styles.chatInfo}>
          <div className={styles.statusIndicator}></div>
          <h3>Чат с {friendName}</h3>
        </div>
        <button 
          onClick={handleClose}
          className={styles.closeButton}
          aria-label="Закрыть чат"
        >
          ×
        </button>
      </div>
      
      <div className={styles.messages}>
        {messages.map(msg => (
          <div key={msg.id} className={`${styles.message} ${msg.isOwn ? styles.ownMessage : styles.friendMessage}`}>
            <div className={styles.messageText}>{msg.text}</div>
            <div className={styles.messageTime}>
              {formatTime(msg.timestamp)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className={styles.messageForm}>
        <input
          type="text"
          value={message}
          onChange={handleMessageChange}
          placeholder="Введите сообщение..."
          className={styles.messageInput}
          maxLength={500}
        />
        <button 
          type="submit" 
          className={styles.sendButton}
          disabled={!message.trim()}
        >
          →
        </button>
      </form>
    </div>
  )
}