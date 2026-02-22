// apps/web/src/app/game/[gameId]/hooks/useGameSession.ts
import { useProfile } from '@/app/profile/hooks/useProfile'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useCallback, useEffect, useRef, useState } from 'react'
import { 
  ExtendedGameState,
  CardDetails, 
  CrisisInfo, 
  GameChatMessage,
  PlayerCardInfo,
  WsMessage,
  CardType,
  ExtendedGamePlayer
} from '@station-eden/shared'
import { getServerCardType, getCardTypeDisplayName } from '../utils/game.utils'
import { useGameTimer } from './useGameTimer'
import { useGameChat } from './useGameChat'
import { useCardReveal } from './useCardReveal'

// Вспомогательная функция для безопасного получения числа
const safeNumber = (value: unknown, defaultValue: number = 1): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? defaultValue : parsed
  }
  return defaultValue
}

export function useGameSession(gameId: string) {
  const { profile, loadUserData } = useProfile()
  const { phaseTimeLeft, startTimer, stopTimer, syncTimerWithServer, setPhaseTimeLeft } = useGameTimer()
  const { 
    chatMessages, 
    newMessage, 
    chatContainerRef, 
    addToChat, 
    setChatMessages, 
    handleMessageChange,
    setNewMessage 
  } = useGameChat()
  const {
    revealingCards,
    revealedCards,
    currentRevealIndex,
    isRevealing,
    revealedPlayer,
    setRevealedPlayer,
    startReveal,
    resetReveal
  } = useCardReveal(addToChat)

  const [gameState, setGameState] = useState<ExtendedGameState | null>(null)
  const [myCards, setMyCards] = useState<Record<string, CardDetails>>({})
  const [selectedVote, setSelectedVote] = useState<string>('')
  const [narration, setNarration] = useState<{ title: string; text: string } | null>(null)
  const [activeCrisis, setActiveCrisis] = useState<CrisisInfo | null>(null)
  const [showMyCards, setShowMyCards] = useState(false)
  const [showCardsTable, setShowCardsTable] = useState(false)
  const [gameResults, setGameResults] = useState<any>(null)
  const [allPlayersCards, setAllPlayersCards] = useState<PlayerCardInfo[]>([])
  const [myRevealedCardsThisRound, setMyRevealedCardsThisRound] = useState<string[]>([])
  const [myAllRevealedCards, setMyAllRevealedCards] = useState<Record<string, { name: string; type: string }>>({})
  const [cardsReceivedThisRound, setCardsReceivedThisRound] = useState<number>(0)
  const [canSkipNarration, setCanSkipNarration] = useState<boolean>(false)
  const [newCardsThisRound, setNewCardsThisRound] = useState<CardDetails[]>([])

  const loadedProfileRef = useRef(false)
  useEffect(() => {
    if (loadedProfileRef.current) return
    loadedProfileRef.current = true
    loadUserData().catch(() => {})
  }, [loadUserData])

  const userId = profile.status === 'ok' ? profile.data?.id : undefined
  const username = profile.status === 'ok' ? profile.data?.username || 'Игрок' : 'Игрок'

  const wsBase = process.env.NEXT_PUBLIC_WS_BASE || 'https://api.stationeden.ru'
  const wsUrl = wsBase.replace(/\/$/, '')

  const isProfileReady = profile.status === 'ok' || profile.status === 'unauth'
  const canConnect = isProfileReady && profile.status === 'ok'
  const socketQuery = { gameId }

  const sendMessageRef = useRef<((msg: unknown) => void) | null>(null)
  const isConnectedRef = useRef<boolean>(false)

  const getCardDisplayName = useCallback(
    (cardType: string, cardId: string): string => {
      const card = myCards[cardType as CardType]
      return card?.name || cardId
    },
    [myCards],
  )

  const updateCardsTable = useCallback(
    (game: ExtendedGameState) => {
      if (!game?.players) return

      const playersInfo: PlayerCardInfo[] = (game.players || []).map(player => {
        const revealedCardsMap: Record<string, { name: string; type: string; cardId: string }> = {}

        if (player.id === userId) {
          Object.entries(myAllRevealedCards).forEach(([cardType, cardInfo]) => {
            revealedCardsMap[cardType] = {
              name: cardInfo.name,
              type: getCardTypeDisplayName(cardType),
              cardId: cardType,
            }
          })
        } else if ((player as ExtendedGamePlayer).revealedCardsInfo) {
          const extPlayer = player as ExtendedGamePlayer
          Object.entries(extPlayer.revealedCardsInfo || {}).forEach(([cardType, card]) => {
            if (card && typeof card === 'object' && 'name' in card) {
              const c = card as { name: string; type: string; id?: string }
              revealedCardsMap[cardType] = {
                name: String(c.name),
                type: getCardTypeDisplayName(cardType),
                cardId: String(c.id ?? cardType),
              }
            }
          })
        }

        return {
          playerId: player.id,
          playerName: player.name,
          revealedCards: revealedCardsMap,
        }
      })

      setAllPlayersCards(playersInfo)
    },
    [myAllRevealedCards, userId, getCardTypeDisplayName],
  )

  // Отслеживаем смену фазы для подготовки к получению карт
  useEffect(() => {
    if (!gameState?.phase) return
    
    console.log(`🎯 Phase changed to: ${gameState.phase}`)
    
    if (gameState.phase === 'preparation') {
      console.log('📦 Preparation phase - ready to receive cards')
      if (cardsReceivedThisRound === 0) {
        addToChat('Система', 'Подготовка к раунду - скоро будут выданы карты...', true)
      }
    }
    
    if (gameState.phase === 'intermission') {
      console.log('⏸️ Intermission phase - between rounds')
    }
  }, [gameState?.phase, cardsReceivedThisRound, addToChat])

  const createHandleWebSocketMessage = useCallback(() => {
    return (data: unknown) => {
      if (!data || typeof data !== 'object') return
      const msg = data as WsMessage

      console.log('📩 Game WebSocket message:', msg.type, msg)

      const sendMessage = sendMessageRef.current
      const isConnected = isConnectedRef.current

      switch (msg.type) {
        case 'GAME_STATE': {
          const game = (msg.gameState as ExtendedGameState) || null
          if (game) {
            // Преобразуем round в число, если это строка
            if (game.round !== undefined) {
              game.round = safeNumber(game.round, 1)
            }
          }
          setGameState(game)

          if (game) {
            updateCardsTable(game)
            syncTimerWithServer(game)

            if (game?.phase === 'introduction') {
              setTimeout(() => setCanSkipNarration(true), 3000)
            } else {
              setCanSkipNarration(false)
            }

            if (game?.phase !== 'crisis' && activeCrisis) {
              setActiveCrisis(null)
            }
          }
          break
        }

        case 'PHASE_CHANGED': {
          const newPhase = String(msg.newPhase ?? '')
          const phaseDuration = typeof msg.duration === 'number' ? msg.duration : undefined
          
          console.log('🔄 Phase changed to:', newPhase, 'duration:', phaseDuration)
          
          stopTimer()
          setPhaseTimeLeft(0)

          if (newPhase === 'voting') {
            setPhaseTimeLeft(30)
            startTimer(30)
            console.log('Started voting timer: 30 seconds')
          } else if (newPhase === 'discussion') {
            setPhaseTimeLeft(60)
            startTimer(60)
            console.log('Started discussion timer: 60 seconds')
          } else if (newPhase === 'crisis') {
            setPhaseTimeLeft(60)
            startTimer(60)
            console.log('Started crisis timer: 60 seconds')
          } else if (newPhase === 'introduction') {
            const introDuration = phaseDuration || 30
            setPhaseTimeLeft(introDuration)
            startTimer(introDuration)
            console.log('Started introduction timer:', introDuration, 'seconds')
            setTimeout(() => setCanSkipNarration(true), 3000)
          }
          break
        }

        case 'YOUR_CARDS': {
          console.log('🃏 Received YOUR_CARDS message:', msg)
          
          const cards: Record<string, CardDetails> = {}
          const newCards: CardDetails[] = []
          let cardCount = 0

          // Функция для добавления карты, если она есть
          const addCard = (key: string, card: CardDetails | undefined, cardType: CardType) => {
            if (card) {
              cards[cardType] = card
              newCards.push(card)
              cardCount++
              console.log(`Added card: ${cardType} - ${card.name}`)
            }
          }

          // Добавляем карты разных типов
          addCard('profession', msg.profession as CardDetails | undefined, 'profession')
          addCard('healthStatus', msg.healthStatus as CardDetails | undefined, 'health')
          addCard('psychologicalTrait', msg.psychologicalTrait as CardDetails | undefined, 'trait')
          addCard('secret', msg.secret as CardDetails | undefined, 'secret')
          addCard('hiddenRole', msg.hiddenRole as CardDetails | undefined, 'role')
          addCard('resource', msg.resource as CardDetails | undefined, 'resource')
          addCard('roleCard', msg.roleCard as CardDetails | undefined, 'role')
          addCard('gender', msg.gender as CardDetails | undefined, 'gender')
          addCard('age', msg.age as CardDetails | undefined, 'age')
          addCard('bodyType', msg.bodyType as CardDetails | undefined, 'body')

          // Обновляем состояние карт
          setMyCards(prevCards => {
            // Если это первый раунд или карты еще не были выданы
            if (Object.keys(prevCards).length === 0) {
              console.log('First round - setting all cards')
              return cards
            }
            
            // Для последующих раундов - добавляем новые карты к существующим
            console.log('Subsequent round - merging new cards with existing')
            return { ...prevCards, ...cards }
          })
          
          // Сохраняем новые карты для отображения
          setNewCardsThisRound(newCards)
          
          // Обновляем счетчик полученных карт в этом раунде
          setCardsReceivedThisRound(cardCount)
          
          console.log(`📊 Cards received this round: ${cardCount}, total cards: ${Object.keys(cards).length}`)

          // Если получены новые карты и мы в фазе подготовки, показываем сообщение
          if (newCards.length > 0 && gameState?.phase === 'preparation') {
            addToChat('Система', `Вам выдано ${cardCount} новых карт в этом раунде!`, true)
            
            // Показываем какие именно карты получены
            const cardNames = newCards.map(c => c.name).join(', ')
            addToChat('Система', `Карты: ${cardNames}`, true)
            
            // Сбрасываем счетчик раскрытых карт для нового раунда
            setMyRevealedCardsThisRound([])
          }
          
          break
        }

        case 'ROUND_STARTED': {
          const roundNumber = safeNumber(msg.roundNumber, gameState?.round ? gameState.round + 1 : 1)
          
          console.log(`🎮 Round ${roundNumber} started!`)
          
          addToChat(
            'Система',
            `Начался раунд ${roundNumber}. Игрокам выдано по 2 новые карты!`,
            true
          )
          
          setMyRevealedCardsThisRound([])
          setCardsReceivedThisRound(0)
          setNewCardsThisRound([])
          
          setGameState(prev => {
            if (!prev) return prev
            return {
              ...prev,
              round: roundNumber
            }
          })
          
          break
        }

        case 'GAME_NARRATION': {
          const title = String(msg.title ?? '')
          const text = String(msg.text ?? '')
          const duration = typeof msg.duration === 'number' ? msg.duration : 30
          
          console.log('📖 Game narration received:', { title, duration })
          
          setNarration({ title, text })
          setPhaseTimeLeft(duration)
          startTimer(duration)
          setTimeout(() => setCanSkipNarration(true), 3000)
          break
        }

        case 'CRISIS_TRIGGERED': {
          const crisis = (msg.crisis as CrisisInfo) || null
          setActiveCrisis(crisis)
          if (crisis?.isActive) {
            setPhaseTimeLeft(60)
            startTimer(60)
          }
          break
        }

        case 'CRISIS_SOLVED': {
          addToChat('Система', `Кризис "${String(msg.crisis ?? '')}" решен игроком ${String(msg.playerName ?? '')}!`, true)
          setActiveCrisis(null)
          stopTimer()
          break
        }

        case 'CRISIS_PENALTY': {
          addToChat('Система', String(msg.message ?? ''), true)
          setActiveCrisis(null)
          stopTimer()
          break
        }

        case 'PLAYER_EJECTED': {
          addToChat('Система', `Игрок ${String(msg.playerName ?? '')} выбыл с ${String(msg.votes ?? '')} голосами!`, true)

          const cards = msg.cards as Record<string, Partial<CardDetails> | null> | undefined
          const playerName = String(msg.playerName ?? '')
          const playerIdMsg = msg.playerId ? String(msg.playerId) : undefined

          if (cards) {
            setRevealedPlayer({
              name: playerName,
              cards,
              playerId: playerIdMsg,
            })
          }
          break
        }

        case 'PLAYER_REVEAL': {
          const playerCards = (msg.cards as Record<string, Partial<CardDetails> | null>) || {}
          const cardTypes = Object.keys(playerCards)

          startReveal(
            {
              name: String(msg.playerName ?? ''),
              cards: playerCards,
              playerId: msg.playerId ? String(msg.playerId) : undefined,
            },
            cardTypes
          )
          break
        }

        case 'CARD_REVEALED': {
          const cardType = String(msg.cardType ?? '')
          const cardId = String(msg.cardId ?? '')
          const playerName = String(msg.playerName ?? '')
          const playerIdMsg = String(msg.playerId ?? '')

          const cardName = getCardDisplayName(cardType, cardId)
          addToChat('Система', `${playerName} раскрыл(а) карту: ${cardName}`, true)

          if (gameState) {
            const updatedGame: ExtendedGameState = { ...gameState }
            const players = (updatedGame.players || []).slice()
            const idx = players.findIndex(p => p.id === playerIdMsg)
            if (idx !== -1) {
              const player = { ...players[idx] } as ExtendedGamePlayer
              const info = { ...(player.revealedCardsInfo || {}) }
              info[cardType] = { name: cardName, type: cardType, id: cardId }
              player.revealedCardsInfo = info
              player.revealedCards = (player.revealedCards || 0) + 1
              players[idx] = player
              updatedGame.players = players
              setGameState(updatedGame)
              updateCardsTable(updatedGame)
            }
          }

          if (playerIdMsg && userId && playerIdMsg === userId) {
            setMyRevealedCardsThisRound(prev => [...prev, cardType])
            setMyAllRevealedCards(prev => ({
              ...prev,
              [cardType]: {
                name: cardName,
                type: getCardTypeDisplayName(cardType),
              },
            }))

            if (isConnected && sendMessage) {
              sendMessage({
                type: 'CARD_REVEALED_CONFIRMATION',
                cardType,
                cardId,
              })
            }
          }
          break
        }

        case 'PLAYER_VOTED':
          addToChat('Система', `${String(msg.voterName ?? '')} проголосовал(а) против ${String(msg.targetName ?? '')}`, true)
          break

        case 'VOTE_REQUESTED':
          addToChat('Система', `${String(msg.playerName ?? '')} запросил(а) голосование (${String(msg.voteCount ?? '')}/${String(msg.requiredCount ?? '')})`, true)
          break

        case 'VOTE_TIED':
          addToChat('Система', String(msg.message ?? ''), true)
          break

        case 'CAPTAIN_VETO_USED':
          addToChat('Система', String(msg.message ?? ''), true)
          break

        case 'SABOTAGE_OCCURRED':
          addToChat('Система', String(msg.message ?? ''), true)
          break

        case 'PLAYER_INFECTED':
          addToChat('Система', `Игрок ${String(msg.playerName ?? '')} заражен игроком ${String(msg.infectedByName ?? '')}!`, true)
          break

        case 'NONBINARY_ABILITY_USED':
          addToChat('Система', String(msg.message ?? ''), true)
          break

        case 'GAME_FINISHED': {
          const winnerIds = (msg.winnerIds as string[]) || []
          setGameResults({
            winners: Array.isArray(winnerIds) ? winnerIds.map(String) : [],
            reason: msg.reason ? String(msg.reason) : undefined,
            scores: msg.finalScores,
          })
          setGameState(prev => (prev ? { ...prev, phase: 'game_over' } : null))
          stopTimer()
          break
        }

        case 'ERROR':
          console.error('Game error:', msg.message)
          addToChat('Система', `Ошибка: ${String(msg.message ?? '')}`, true)
          break

        case 'CHAT_MESSAGE': {
          const raw = msg.message
          if (raw && typeof raw === 'object') {
            const m = raw as Record<string, unknown>
            const chatMsg: GameChatMessage = {
              id: String(m.id ?? Date.now().toString() + Math.random()),
              playerId: String(m.playerId ?? 'player'),
              playerName: String(m.playerName ?? 'Игрок'),
              text: String(m.text ?? '').slice(0, 300),
              type: 'player',
              timestamp: new Date(
                typeof m.timestamp === 'string' || typeof m.timestamp === 'number'
                  ? m.timestamp
                  : Date.now(),
              ),
            }
            setChatMessages(prev => [...prev.slice(-50), chatMsg])
          }
          break
        }

        case 'REVEAL_PHASE_START':
          setGameState(prev => (prev ? { ...prev, phase: 'reveal' } : prev))
          addToChat('Система', 'Началось раскрытие карт выбывшего игрока', true)
          break

        case 'DISCUSSION_STARTED':
          addToChat('Система', 'Началось общее обсуждение на 1 минуту!', true)
          setPhaseTimeLeft(60)
          startTimer(60)
          break

        case 'ALL_CARDS_REVEALED':
          addToChat('Система', 'Все игроки раскрыли по карте в этом раунде!', true)
          break

        case 'TIMER_UPDATE':
          if (typeof msg.timeLeft === 'number') {
            console.log('⏱️ Timer update from server:', msg.timeLeft)
            setPhaseTimeLeft(msg.timeLeft)
            if (msg.timeLeft > 0) {
              startTimer(msg.timeLeft)
            } else {
              stopTimer()
            }
          }
          break
          
        default:
          break
      }
    }
  }, [
    activeCrisis,
    addToChat,
    gameState,
    getCardDisplayName,
    startTimer,
    stopTimer,
    syncTimerWithServer,
    updateCardsTable,
    userId,
    startReveal,
    setChatMessages,
    setPhaseTimeLeft,
    setRevealedPlayer,
  ])

  const handleWebSocketMessage = createHandleWebSocketMessage()

  const { sendMessage, isConnected } = useWebSocket(
    wsUrl,
    handleWebSocketMessage,
    socketQuery,
    { path: '/game', enabled: canConnect },
  )

  useEffect(() => {
    sendMessageRef.current = sendMessage as unknown as (msg: unknown) => void
    isConnectedRef.current = Boolean(isConnected)
  }, [sendMessage, isConnected])

  const joinedRef = useRef(false)
  useEffect(() => {
    if (!isConnected) {
      joinedRef.current = false
      return
    }
    if (!gameId) return
    if (joinedRef.current) return
    if (profile.status !== 'ok' || !userId) {
      return
    }

    joinedRef.current = true
    console.log('Connected to game, joining...')
    ;(sendMessage as unknown as (msg: unknown) => void)({
      type: 'JOIN_GAME',
      gameId,
    })
  }, [isConnected, gameId, sendMessage, profile.status, userId])

  useEffect(() => {
    const syncTimer = () => {
      if (!gameState || !gameState.phase || !gameState.phaseEndTime) return

      const now = Date.now()
      const endTime = new Date(String(gameState.phaseEndTime)).getTime()
      const secondsLeft = Math.max(0, Math.floor((endTime - now) / 1000))

      if (Math.abs(phaseTimeLeft - secondsLeft) > 1) {
        console.log('Syncing timer - local:', phaseTimeLeft, 'server:', secondsLeft)
        setPhaseTimeLeft(secondsLeft)
      }
    }

    const interval = setInterval(syncTimer, 5000)
    return () => clearInterval(interval)
  }, [gameState, phaseTimeLeft, setPhaseTimeLeft])

  const handleSendMessage = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault()

      if (profile.status !== 'ok' || !userId) return
      if (!newMessage.trim() || !isConnected) return

      const playerName = username
      const myId = userId

      ;(sendMessage as unknown as (msg: unknown) => void)({
        type: 'SEND_MESSAGE',
        message: {
          text: newMessage.trim(),
          playerName,
          gameId,
        },
      })

      const tempMessage: GameChatMessage = {
        id: `temp-${Date.now()}-${Math.random()}`,
        playerId: myId,
        playerName,
        text: newMessage.trim(),
        type: 'player',
        timestamp: new Date(),
      }

      setChatMessages(prev => [...prev.slice(-50), tempMessage])
      setNewMessage('')
    },
    [newMessage, isConnected, sendMessage, username, gameId, userId, profile.status, setChatMessages, setNewMessage],
  )

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage],
  )

  const handleStartGame = () => {
    if (!isConnected) return
    if (profile.status !== 'ok' || !userId) return
    ;(sendMessage as unknown as (msg: unknown) => void)({
      type: 'START_GAME_SESSION',
    })
  }

  const handleSkipNarration = () => {
    if (canSkipNarration && isConnected) {
      console.log('Skipping narration')
      ;(sendMessage as unknown as (msg: unknown) => void)({
        type: 'SKIP_NARRATION',
      })
      setNarration(null)
      stopTimer()
    }
  }

  const handleStartDiscussion = () => {
    if (!isConnected) return
    ;(sendMessage as unknown as (msg: unknown) => void)({
      type: 'START_DISCUSSION',
    })
  }

  const handleRevealCard = (cardType: CardType) => {
    const card = myCards[cardType]
    if (!card || !isConnected) return

    if (myRevealedCardsThisRound.includes(cardType)) {
      addToChat('Система', 'Вы уже раскрыли карту в этом раунде!', true)
      return
    }

    if (myAllRevealedCards[cardType]) {
      addToChat('Система', 'Вы уже раскрывали эту карту ранее!', true)
      return
    }

    if (myRevealedCardsThisRound.length >= 1) {
      addToChat('Система', 'В этом раунде можно раскрыть только одну карту!', true)
      return
    }

    ;(sendMessage as unknown as (msg: unknown) => void)({
      type: 'REVEAL_CARD',
      cardType: getServerCardType(cardType),
      cardId: card.id,
    })
  }

  const handleVote = (targetPlayerId: string) => {
    if (!isConnected) return

    setSelectedVote(targetPlayerId)
    ;(sendMessage as unknown as (msg: unknown) => void)({
      type: 'VOTE_PLAYER',
      targetPlayerId,
    })
  }

  const handleRequestVote = () => {
    if (!isConnected) return
    ;(sendMessage as unknown as (msg: unknown) => void)({
      type: 'REQUEST_VOTE',
    })
  }

  const handleUseAbility = (ability: string, targetPlayerId?: string) => {
    if (!isConnected) return
    ;(sendMessage as unknown as (msg: unknown) => void)({
      type: 'USE_ABILITY',
      ability,
      targetPlayerId,
    })
  }

  const handleSolveCrisis = () => {
    if (!isConnected) return
    ;(sendMessage as unknown as (msg: unknown) => void)({
      type: 'SOLVE_CRISIS',
    })
  }

  const handleCloseCrisis = () => {
    setActiveCrisis(null)
  }

  const handleLeaveGame = () => {
    if (window.confirm('Вы уверены, что хотите покинуть игру?')) {
      ;(sendMessage as unknown as (msg: unknown) => void)({
        type: 'LEAVE_GAME',
        gameId,
      })
      setTimeout(() => {
        window.location.href = '/lobby'
      }, 1000)
    }
  }

  return {
    // Состояния
    gameState,
    myCards,
    selectedVote,
    phaseTimeLeft,
    narration,
    activeCrisis,
    showMyCards,
    showCardsTable,
    gameResults,
    allPlayersCards,
    myRevealedCardsThisRound,
    myAllRevealedCards,
    cardsReceivedThisRound,
    canSkipNarration,
    newCardsThisRound,
    
    // Состояния раскрытия
    revealingCards,
    revealedCards,
    currentRevealIndex,
    isRevealing,
    revealedPlayer,
    
    // Чат
    chatMessages,
    newMessage,
    chatContainerRef,
    
    // Профиль
    userId,
    username,
    profile,
    isConnected,
    
    // Сеттеры для UI
    setShowMyCards,
    setShowCardsTable,
    setActiveCrisis,
    setGameResults,
    setRevealedPlayer,
    resetReveal,
    
    // Обработчики
    handleSendMessage,
    handleKeyPress,
    handleMessageChange,
    handleStartGame,
    handleSkipNarration,
    handleStartDiscussion,
    handleRevealCard,
    handleVote,
    handleRequestVote,
    handleUseAbility,
    handleSolveCrisis,
    handleCloseCrisis,
    handleLeaveGame,
    setSelectedVote,
    addToChat,
  }
}