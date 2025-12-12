'use client'

import { useEffect, useState, memo, useRef } from 'react'
import { useProfile } from '@/app/profile/hooks/useProfile'
import { ChatMessage } from '@station-eden/shared'
import { useGameLogic } from '../hooks/useGameLogic'

import GamePhase from '../components/GamePhase/GamePhase'
import PlayerInfo from '../components/PlayerInfo/PlayerInfo'
import PlayersList from '../components/PlayersList/PlayersList'
import VotingSystem from '../components/VotingSystem/VotingSystem'
import CrisisSystem from '../components/CrisisSystem/CrisisSystem'
import Chat from '@/app/lobby/components/Chat/Chat'
import PlayersCharacteristics from '../components/PlayersCharacteristics/PlayersCharacteristics'
import DeckViewer from '../components/DeckViewer/DeckViewer'

import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile'
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars'
import TopHUD from '@/components/TopHUD/TopHUD'

import styles from './page.module.css'

const MemoizedFireflies = memo(FirefliesProfile)
const MemoizedStars = memo(TwinklingStars)
const MemoizedTopHUD = memo(TopHUD)

type GamePageClientProps = {
  gameId: string
}

export default function GamePageClient({ gameId }: GamePageClientProps) {
  const profile = useProfile()

  const [isLoading, setIsLoading] = useState(true)
  const [serverGameData, setServerGameData] = useState<any>(null)
  
  // Используем хук игровой логики
  const {
    phase,
    round,
    timeLeft,
    players,
    currentCrisis,
    revealedCards,
    handlePhaseAction,
    handleRevealCard,
    handleVote,
    handleCrisisSolution,
    syncWithServer
  } = useGameLogic(gameId, serverGameData?.players || [])
  
  // Состояния для чата
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'system-init',
      playerId: 'system',
      playerName: 'Система',
      text: 'Загрузка игры...',
      timestamp: new Date().toISOString(),
      type: 'system'
    }
  ])
  const [newMessage, setNewMessage] = useState('')
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
  // Новые состояния
  const [isCharacteristicsOpen, setIsCharacteristicsOpen] = useState(false)
  const [isDeckViewerOpen, setIsDeckViewerOpen] = useState(false)

  const userData = profile.profile.data
  const currentUserId = userData?.id

  // Подготовим данные для TopHUD
  const topHudProfile = {
    status: profile.profile.status,
    userId: userData?.id,
    email: userData?.email,
    username: userData?.username || 'Игрок',
    message: profile.profile.message,
  }

  // Загрузка игры с сервера
  useEffect(() => {
    const loadGame = async () => {
      try {
        console.log('🎮 Загрузка игры с ID:', gameId)
        const res = await fetch(`/api/game/${gameId}`)
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        
        const data = await res.json()
        console.log('✅ Данные игры получены:', data)
        
        setServerGameData(data)
        
        // Загрузка истории чата
        const chatRes = await fetch(`/api/game/${gameId}/chat`)
        if (chatRes.ok) {
          const chatHistory = await chatRes.json()
          setMessages(chatHistory)
        }
        
        // Добавляем системное сообщение
        const phaseMessage: ChatMessage = {
          id: `phase-${Date.now()}`,
          playerId: 'system',
          playerName: 'Система',
          text: `Игра загружена. Фаза: ${data.phase || 'preparation'}. Раунд: ${data.round || 1}`,
          timestamp: new Date().toISOString(),
          type: 'system'
        }
        setMessages(prev => [...prev, phaseMessage])
        
      } catch (e) {
        console.error('❌ Ошибка загрузки игры:', e)
        
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          playerId: 'system',
          playerName: 'Система',
          text: 'Не удалось загрузить данные игры. Используется локальная версия.',
          timestamp: new Date().toISOString(),
          type: 'system'
        }
        setMessages(prev => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
    }

    loadGame()
  }, [gameId])

  // Логирование состояния игры
  useEffect(() => {
    console.log('📊 Текущее состояние игры:')
    console.log('- Фаза:', phase)
    console.log('- Раунд:', round)
    console.log('- Время:', timeLeft)
    console.log('- Игроков:', players.length)
    console.log('- Карт у первого игрока:', players[0]?.cards?.length || 0)
    console.log('- Кризис:', currentCrisis?.title || 'нет')
  }, [phase, round, timeLeft, players, currentCrisis])

  // Обработчики для чата
  const handleMessageChange = (message: string) => {
    setNewMessage(message)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !currentUserId) return

    const message: ChatMessage = {
      id: Date.now().toString(),
      playerId: currentUserId,
      playerName: userData?.username || 'Игрок',
      text: newMessage,
      timestamp: new Date().toISOString(),
      type: 'player'
    }

    // Оптимистичное обновление UI
    setMessages(prev => [...prev, message])
    setNewMessage('')
    
    try {
      // Отправка на сервер
      const response = await fetch(`/api/game/${gameId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`)
      }
      
      const result = await response.json()
      if (result.chatHistory) {
        setMessages(result.chatHistory)
      }
      
    } catch (error) {
      console.error('❌ Error sending message:', error)
      
      const errorMessage: ChatMessage = {
        id: `send-error-${Date.now()}`,
        playerId: 'system',
        playerName: 'Система',
        text: 'Не удалось отправить сообщение. Проверьте подключение.',
        timestamp: new Date().toISOString(),
        type: 'system'
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  const handleChatScroll = () => {
    // Логика для загрузки истории при прокрутке вверх
    const container = chatContainerRef.current
    if (container && container.scrollTop === 0) {
      console.log('Загрузка истории чата...')
      // Можно добавить загрузку старых сообщений
    }
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <MemoizedFireflies />
        <MemoizedStars />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>Загрузка игры...</p>
          <p className={styles.loadingDetails}>ID: {gameId}</p>
        </div>
      </main>
    )
  }

  if (serverGameData?.status === 'not_found') {
    return (
      <main className={styles.page}>
        <MemoizedFireflies />
        <MemoizedStars />
        <div className={styles.errorContainer}>
          <h1>Игра не найдена</h1>
          <p>{serverGameData.message}</p>
          <button 
            className={styles.returnButton}
            onClick={() => (window.location.href = '/lobby')}
          >
            Вернуться в лобби
          </button>
        </div>
      </main>
    )
  }

  const currentPlayer = players.find(p => p.id === currentUserId) || players[0]

  return (
    <main className={styles.page}>
      <MemoizedFireflies />
      <MemoizedStars />
      
      <MemoizedTopHUD profile={topHudProfile} />

      <div className={styles.gameGrid}>
        {/* Левая панель - список игроков и кнопка характеристик */}
        <div className={styles.leftPanel}>
          <div className={styles.leftPanelTop}>
            <PlayersList
              players={players}
              currentUserId={currentUserId}
              gamePhase={phase}
              onPlayerClick={(player) => {
                console.log('Clicked player:', player)
              }}
            />
          </div>
          
          <div className={styles.leftPanelBottom}>
            <button 
              className={styles.characteristicsButton}
              onClick={() => setIsCharacteristicsOpen(true)}
            >
              📊 Характеристики игроков
            </button>
            
            <button 
              className={styles.deckButton}
              onClick={() => setIsDeckViewerOpen(true)}
            >
              🃏 Моя колода ({currentPlayer?.cards?.length || 0})
            </button>
          </div>
        </div>

        {/* Центральная панель - фаза игры с кругом */}
        <div className={styles.centerPanel}>
          <div className={styles.phaseCircle}>
            <GamePhase 
              phase={phase}
              round={round}
              timeLeft={timeLeft}
              onPhaseAction={handlePhaseAction}
            />
          </div>
        </div>

        {/* Правая панель - информация игрока и чат */}
        <div className={styles.rightPanel}>
          <div className={styles.rightPanelTop}>
            {currentPlayer ? (
              <PlayerInfo
                player={currentPlayer}
                gamePhase={phase}
                onRevealCard={async (cardId) => {
                  console.log('Раскрытие карты:', cardId)
                  if (currentUserId) {
                    try {
                      await handleRevealCard(currentUserId, cardId)
                      
                      // Добавляем сообщение в чат
                      const card = currentPlayer.cards.find(c => c.id === cardId)
                      if (card) {
                        const revealMessage: ChatMessage = {
                          id: `reveal-${Date.now()}`,
                          playerId: currentUserId,
                          playerName: userData?.username || 'Игрок',
                          text: `🃏 Раскрыл карту: ${card.title}`,
                          timestamp: new Date().toISOString(),
                          type: 'player'
                        }
                        
                        // Оптимистичное обновление
                        setMessages(prev => [...prev, revealMessage])
                        
                        // Отправка на сервер
                        await fetch(`/api/game/${gameId}/chat`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(revealMessage)
                        })
                      }
                    } catch (error) {
                      console.error('❌ Error revealing card:', error)
                    }
                  }
                }}
                onUseAbility={(abilityId) => {
                  console.log('Использование способности:', abilityId)
                  // Здесь будет логика использования способностей
                }}
              />
            ) : (
              <div className={styles.playerInfoContainer}>
                <div className={styles.loadingMessage}>
                  Загрузка информации об игроке...
                </div>
              </div>
            )}
          </div>
          
          <div className={styles.rightPanelBottom}>
            <Chat
              lobbyId={gameId}
              messages={messages}
              newMessage={newMessage}
              onMessageChange={handleMessageChange}
              onSendMessage={handleSendMessage}
              onKeyPress={handleKeyPress}
              onChatScroll={handleChatScroll}
              chatContainerRef={chatContainerRef}
            />
          </div>
        </div>
      </div>

      {phase === 'voting' && (
        <VotingSystem
          players={players.filter(p => p.isAlive)}
          timeLeft={timeLeft}
          onVote={async (playerId) => {
            console.log('Голосование против игрока:', playerId)
            if (currentUserId) {
              try {
                await handleVote(currentUserId, playerId)
                
                // Добавляем сообщение в чат
                const targetPlayer = players.find(p => p.id === playerId)
                const voteMessage: ChatMessage = {
                  id: `vote-${Date.now()}`,
                  playerId: currentUserId,
                  playerName: userData?.username || 'Игрок',
                  text: `🗳️ Проголосовал против ${targetPlayer?.username || 'игрока'}`,
                  timestamp: new Date().toISOString(),
                  type: 'player'
                }
                
                setMessages(prev => [...prev, voteMessage])
                
                // Отправка на сервер
                await fetch(`/api/game/${gameId}/chat`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(voteMessage)
                })
              } catch (error) {
                console.error('❌ Error voting:', error)
              }
            }
          }}
        />
      )}

      {phase === 'crisis' && currentCrisis && (
        <CrisisSystem
          crisis={currentCrisis}
          timeLeft={timeLeft}
          onResolve={async (solution) => {
            console.log('Решение кризиса:', solution)
            try {
              await handleCrisisSolution(solution)
              
              // Добавляем сообщение в чат
              const crisisMessage: ChatMessage = {
                id: `crisis-${Date.now()}`,
                playerId: currentUserId || 'system',
                playerName: userData?.username || 'Команда',
                text: `🚨 Предложил решение кризиса: ${solution}`,
                timestamp: new Date().toISOString(),
                type: 'player'
              }
              
              setMessages(prev => [...prev, crisisMessage])
              
              await fetch(`/api/game/${gameId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(crisisMessage)
              })
            } catch (error) {
              console.error('❌ Error solving crisis:', error)
            }
          }}
        />
      )}

      {/* Модальное окно характеристик игроков */}
      <PlayersCharacteristics
        players={players}
        isOpen={isCharacteristicsOpen}
        onClose={() => setIsCharacteristicsOpen(false)}
      />

      {/* Модальное окно просмотра колоды */}
      {currentPlayer && (
        <DeckViewer
          player={currentPlayer}
          isOpen={isDeckViewerOpen}
          onClose={() => setIsDeckViewerOpen(false)}
        />
      )}
    </main>
  )
}