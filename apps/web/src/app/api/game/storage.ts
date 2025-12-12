import { GamePhase, Card, GamePlayer, Crisis, CardType } from '../../game/types/game.types'

// Тип для хранения игры
export interface StoredGame {
  id: string
  phase: GamePhase
  round: number
  players: GamePlayer[]
  currentCrisis: Crisis | null
  chatHistory: any[]
  timeLeft: number
  startTime: Date
  updatedAt?: Date
  votes: Record<string, string>
  revealedCards: Record<string, Card[]>
  ejectedPlayers: string[]
  capsuleSlots: { total: number; occupied: number }
  status: 'active' | 'finished' | 'error'
}

// Базовые карты для раздачи
interface BaseCard {
  type: CardType
  title: string
  description: string
  bonus?: string
  penalty?: string
  ability?: string
}

// Временное хранилище (в продакшене используйте Redis или базу данных)
const games = new Map<string, StoredGame>()

// Базовые карты для раздачи
const baseCards: BaseCard[] = [
  // Профессии
  {
    type: 'profession',
    title: 'Инженер-кинетик',
    description: 'Может починить любую систему голыми руками',
    bonus: '+2 к ремонту во время кризисов',
    penalty: 'Разбирается в системах станции'
  },
  {
    type: 'profession',
    title: 'Астробиолог',
    description: 'Знает, какие инопланетные споры съедобны',
    bonus: 'Может идентифицировать биологические угрозы',
    penalty: 'Часто пропадает в лаборатории'
  },
  {
    type: 'profession',
    title: 'Пилот-ас',
    description: 'Может посадить корабль с закрытыми глазами',
    bonus: 'Критически важен для управления капсулой',
    penalty: 'Всегда хочет быть у штурвала'
  },
  {
    type: 'profession',
    title: 'Ксенолингвист',
    description: 'Говорит на 14 инопланетных языках',
    bonus: 'Может расшифровать инопланетные сигналы',
    penalty: 'Иногда переводит "с ошибками"'
  },
  // Состояние здоровья
  {
    type: 'health',
    title: 'Кибернетические импланты',
    description: 'На 40% эффективнее, на 100% подозрительнее',
    bonus: 'Не подвержен биологическим угрозам',
    penalty: 'Может коротнуть'
  },
  {
    type: 'health',
    title: 'Латентный вирус Кси-7',
    description: 'Заразен в условиях стресса',
    bonus: 'Иммунитет к некоторым патогенам',
    penalty: 'Может заразить других игроков'
  },
  {
    type: 'health',
    title: 'Генная модификация "Феникс"',
    description: 'Быстрая регенерация',
    bonus: 'Восстанавливается после кризисов быстрее',
    penalty: 'Подозрительная живучесть'
  },
  // Психологические черты
  {
    type: 'psychology',
    title: 'Паникёр',
    description: 'Видит угрозу в каждой тени',
    penalty: 'Часто ошибается в оценках',
    ability: 'Иногда оказывается прав'
  },
  {
    type: 'psychology',
    title: 'Хладнокровный прагматик',
    description: 'Числа не лгут. Люди – иногда',
    bonus: 'Точно оценивает статистику выживания',
    penalty: 'Кажется бесчувственным'
  },
  {
    type: 'psychology',
    title: 'Безрассудно храбрый',
    description: 'Первый в опасность, последний в капсулу',
    bonus: 'Спасает других во время кризисов',
    penalty: 'Часто рискует без необходимости'
  },
  // Секреты
  {
    type: 'secret',
    title: 'ИИ в биоморфном теле',
    description: 'Я — ИИ, скрывающийся в биоморфном теле',
    ability: 'Может взламывать системы станции',
    penalty: 'Цель: добраться до Земли любой ценой'
  },
  {
    type: 'secret',
    title: 'Виновен в катастрофе',
    description: 'Я виновен в катастрофе',
    penalty: 'Совершил роковую ошибку',
    ability: 'Цель: искупить вину или скрыть правду'
  },
  // Багаж/ресурсы
  {
    type: 'baggage',
    title: 'Семенной банк редких растений',
    description: 'Может восстановить биосферу',
    bonus: 'Ценный научный ресурс',
    penalty: 'Занимает место в капсуле'
  },
  {
    type: 'baggage',
    title: 'Личный боевой дрон',
    description: 'Защищает во время кризисов',
    bonus: 'Может быть использован для защиты',
    penalty: 'Может быть использован для угроз'
  },
  // Роли
  {
    type: 'role',
    title: 'Капитан станции',
    description: 'Командир станции',
    ability: 'Имеет право вето на одно голосование за игру'
  },
  {
    type: 'role',
    title: 'Старший офицер',
    description: 'Заместитель капитана',
    ability: 'Дополнительный голос при ничьей'
  },
  // Пол
  {
    type: 'gender',
    title: 'Мужчина',
    description: 'Мужской пол',
    bonus: '+1 к телосложению в кризисах, связанных с силой'
  },
  {
    type: 'gender',
    title: 'Женщина',
    description: 'Женский пол',
    bonus: '+1 к дипломатии и медицине',
    penalty: 'Меньший расход кислорода'
  },
  // Возраст
  {
    type: 'age',
    title: 'Молодой (18-25)',
    description: 'Молодой возраст',
    bonus: 'Более обучаем и адаптивен',
    penalty: 'Меньше опыта'
  },
  {
    type: 'age',
    title: 'Зрелый (26-50)',
    description: 'Зрелый возраст',
    bonus: 'Баланс опыта и физической формы'
  },
  // Телосложение
  {
    type: 'body',
    title: 'Худощавое',
    description: 'Худощавое телосложение',
    bonus: 'Меньше потребляет кислорода',
    penalty: 'Меньшая физическая сила'
  },
  {
    type: 'body',
    title: 'Атлетическое',
    description: 'Атлетическое телосложение',
    bonus: 'Хороший баланс силы и выносливости'
  }
]

// Функция для создания новой игры
export function createGame(gameId: string, initialPlayers: any[] = []): StoredGame {
  console.log('🎮 Создание новой игры:', gameId)
  
  // Создаем базовых игроков если не переданы
  const players: GamePlayer[] = initialPlayers.length > 0 
    ? initialPlayers.map((player, index) => ({
        id: player.id || `player-${index}`,
        username: player.username || `Игрок ${index + 1}`,
        avatar: player.avatar,
        cards: [],
        isAlive: true,
        isInCapsule: false,
        votedFor: undefined,
        hasRevealedCard: false,
        role: player.role
      }))
    : generateTestPlayers()
  
  // Раздаем карты
  const playersWithCards = players.map(player => ({
    ...player,
    cards: distributeCardsToPlayer(player.id)
  }))
  
  const newGame: StoredGame = {
    id: gameId,
    phase: 'preparation',
    round: 1,
    players: playersWithCards,
    currentCrisis: null,
    chatHistory: [
      {
        id: 'system-welcome',
        playerId: 'system',
        playerName: 'Система',
        text: '🎮 Игра началась! Начинается фаза подготовки (1 минута). Изучите свои карты.',
        timestamp: new Date().toISOString(),
        type: 'system'
      }
    ],
    timeLeft: 60, // 1 минута на подготовку
    startTime: new Date(),
    votes: {},
    revealedCards: {},
    ejectedPlayers: [],
    capsuleSlots: { total: Math.ceil(players.length / 2), occupied: 0 },
    status: 'active'
  }
  
  games.set(gameId, newGame)
  console.log('✅ Игра создана:', gameId, 'Игроков:', playersWithCards.length)
  return newGame
}

// Функция раздачи карт игроку
function distributeCardsToPlayer(playerId: string): Card[] {
  const cards: Card[] = []
  const availableCards = [...baseCards]
  
  // Каждый игрок получает 5 случайных карт
  for (let i = 0; i < 5; i++) {
    if (availableCards.length === 0) break
    
    const randomIndex = Math.floor(Math.random() * availableCards.length)
    const baseCard = availableCards[randomIndex]
    
    const card: Card = {
      id: `${playerId}-card-${i}-${Date.now()}`,
      type: baseCard.type,
      title: baseCard.title,
      description: baseCard.description,
      bonus: baseCard.bonus,
      penalty: baseCard.penalty,
      ability: baseCard.ability,
      isRevealed: false
    }
    
    cards.push(card)
    availableCards.splice(randomIndex, 1)
  }
  
  return cards
}

// Функция генерации тестовых игроков
function generateTestPlayers(): GamePlayer[] {
  const names = ['Алексей', 'Мария', 'Дмитрий', 'Екатерина', 'Иван', 'Ольга']
  const roles = ['Капитан', 'Пилот', 'Инженер', 'Ученый', 'Врач', 'Техник']
  
  return Array.from({ length: 4 }, (_, i) => ({
    id: `test-player-${i}`,
    username: names[i] || `Игрок ${i + 1}`,
    avatar: null,
    cards: [],
    isAlive: true,
    isInCapsule: false,
    votedFor: undefined,
    hasRevealedCard: false,
    role: roles[i] || 'Экипаж'
  }))
}

// Получение игры
export function getGame(gameId: string): StoredGame | null {
  return games.get(gameId) || null
}

// Проверка существования игры
export function hasGame(gameId: string): boolean {
  return games.has(gameId)
}

// Обновление игры
export function updateGame(gameId: string, updates: Partial<StoredGame>): StoredGame | null {
  const game = getGame(gameId)
  if (!game) return null
  
  const updatedGame: StoredGame = { 
    ...game, 
    ...updates, 
    updatedAt: new Date()
  }
  
  games.set(gameId, updatedGame)
  return updatedGame
}

// Раскрытие карты
export function revealCard(gameId: string, playerId: string, cardId: string): boolean {
  const game = getGame(gameId)
  if (!game) return false
  
  const player = game.players.find(p => p.id === playerId)
  if (!player) return false
  
  // Находим и обновляем карту
  const cardIndex = player.cards.findIndex(c => c.id === cardId)
  if (cardIndex === -1) return false
  
  player.cards[cardIndex].isRevealed = true
  player.hasRevealedCard = true
  
  // Добавляем в список раскрытых карт
  const revealedCard = player.cards[cardIndex]
  game.revealedCards[playerId] = game.revealedCards[playerId] || []
  game.revealedCards[playerId].push(revealedCard)
  
  // Добавляем сообщение в чат
  game.chatHistory.push({
    id: `reveal-${Date.now()}`,
    playerId: 'system',
    playerName: 'Система',
    text: `🃏 ${player.username} раскрыл карту: "${revealedCard.title}"`,
    timestamp: new Date().toISOString(),
    type: 'system'
  })
  
  // Обновляем игру
  updateGame(gameId, game)
  return true
}

// Голосование
export function vote(gameId: string, voterId: string, targetPlayerId: string): boolean {
  const game = getGame(gameId)
  if (!game) return false
  
  // Проверяем, что оба игрока существуют и живы
  const voter = game.players.find(p => p.id === voterId)
  const target = game.players.find(p => p.id === targetPlayerId)
  
  if (!voter || !target || !voter.isAlive || !target.isAlive) {
    return false
  }
  
  // Записываем голос
  game.votes[voterId] = targetPlayerId
  
  // Обновляем голос игрока
  voter.votedFor = targetPlayerId
  
  // Добавляем сообщение в чат
  game.chatHistory.push({
    id: `vote-${Date.now()}`,
    playerId: 'system',
    playerName: 'Система',
    text: `🗳️ ${voter.username} проголосовал против ${target.username}`,
    timestamp: new Date().toISOString(),
    type: 'system'
  })
  
  updateGame(gameId, game)
  return true
}

// Обработка окончания фазы
export function processPhaseEnd(gameId: string): StoredGame | null {
  const game = getGame(gameId)
  if (!game) return null
  
  switch (game.phase) {
    case 'preparation':
      game.phase = 'discussion'
      game.timeLeft = 180 // 3 минуты
      game.chatHistory.push({
        id: `phase-${Date.now()}`,
        playerId: 'system',
        playerName: 'Система',
        text: '💬 Начинается фаза обсуждения (3 минуты). Каждый должен раскрыть 1 карту.',
        timestamp: new Date().toISOString(),
        type: 'system'
      })
      break
      
    case 'discussion':
      game.phase = 'voting'
      game.timeLeft = 60 // 1 минута
      game.chatHistory.push({
        id: `phase-${Date.now()}`,
        playerId: 'system',
        playerName: 'Система',
        text: '🗳️ Начинается фаза голосования (1 минута). Проголосуйте за исключение игрока.',
        timestamp: new Date().toISOString(),
        type: 'system'
      })
      break
      
    case 'voting':
      // Подсчет голосов
      const voteCount: Record<string, number> = {}
      Object.values(game.votes).forEach(targetId => {
        voteCount[targetId] = (voteCount[targetId] || 0) + 1
      })
      
      // Находим игрока с максимальным количеством голосов
      let maxVotes = 0
      let ejectedPlayerId: string | null = null
      
      Object.entries(voteCount).forEach(([playerId, count]) => {
        if (count > maxVotes) {
          maxVotes = count
          ejectedPlayerId = playerId
        }
      })
      
      // Исключаем игрока
      if (ejectedPlayerId) {
        game.players = game.players.map(player => 
          player.id === ejectedPlayerId 
            ? { ...player, isAlive: false }
            : player
        )
        game.ejectedPlayers.push(ejectedPlayerId)
        
        // Добавляем сообщение в чат
        const ejectedPlayer = game.players.find(p => p.id === ejectedPlayerId)
        game.chatHistory.push({
          id: `eject-${Date.now()}`,
          playerId: 'system',
          playerName: 'Система',
          text: `🚀 Игрок ${ejectedPlayer?.username || 'Unknown'} исключен со станции с ${maxVotes} голосами!`,
          timestamp: new Date().toISOString(),
          type: 'system'
        })
      }
      
      // Переходим к раскрытию
      game.phase = 'reveal'
      game.timeLeft = 30 // 30 секунд
      game.votes = {} // Очищаем голоса
      game.chatHistory.push({
        id: `phase-${Date.now()}`,
        playerId: 'system',
        playerName: 'Система',
        text: '🃏 Фаза раскрытия (30 секунд). Выбывший игрок показывает свои карты.',
        timestamp: new Date().toISOString(),
        type: 'system'
      })
      break
      
    case 'reveal':
      // Проверяем, нужно ли генерировать кризис
      if (game.round >= 3) { // Для теста ставим 3 вместо 5
        game.phase = 'crisis'
        game.currentCrisis = generateRandomCrisis()
        game.timeLeft = game.currentCrisis.duration
        game.chatHistory.push({
          id: `crisis-${Date.now()}`,
          playerId: 'system',
          playerName: 'Система',
          text: `🚨 КРИЗИС: ${game.currentCrisis.title}! ${game.currentCrisis.description}`,
          timestamp: new Date().toISOString(),
          type: 'system'
        })
      } else {
        // Новый раунд
        game.phase = 'discussion'
        game.round += 1
        game.timeLeft = 180
        
        // Сбрасываем флаги раскрытия карт
        game.players.forEach((player: GamePlayer) => {
          player.hasRevealedCard = false
        })
        
        game.chatHistory.push({
          id: `round-${Date.now()}`,
          playerId: 'system',
          playerName: 'Система',
          text: `🔄 Раунд ${game.round}! Начинается фаза обсуждения.`,
          timestamp: new Date().toISOString(),
          type: 'system'
        })
      }
      break
      
    case 'crisis':
      // Завершение кризиса
      game.phase = 'discussion'
      game.round += 1
      game.timeLeft = 180
      game.currentCrisis = null
      
      // Сбрасываем флаги раскрытия карт
      game.players.forEach((player: GamePlayer) => {
        player.hasRevealedCard = false
      })
      
      game.chatHistory.push({
        id: `crisis-end-${Date.now()}`,
        playerId: 'system',
        playerName: 'Система',
        text: '✅ Кризис разрешен! Возвращаемся к обсуждению.',
        timestamp: new Date().toISOString(),
        type: 'system'
      })
      break
  }
  
  return updateGame(gameId, game)
}

// Генерация случайного кризиса
function generateRandomCrisis(): Crisis {
  const crises: Crisis[] = [
    {
      id: 'crisis-tech-1',
      type: 'technological',
      title: 'Утечка в отсеке хранения',
      description: 'Обнаружена утечка опасных веществ в отсеке хранения. Требуется немедленное устранение.',
      priority: ['Инженер-кинетик', 'Инженер-подрывник'],
      penalty: '-1 место в капсуле',
      duration: 120,
      solutions: ['Использовать наноботов', 'Заварить утечку вручную', 'Эвакуировать отсек']
    },
    {
      id: 'crisis-bio-1',
      type: 'biological',
      title: 'Вспышка неизвестного патогена',
      description: 'В биолаборатории обнаружена вспышка неизвестного патогена. Требуется срочная изоляция.',
      priority: ['Астробиолог', 'Кибернетический хирург'],
      penalty: 'Случайный игрок получает заболевание',
      duration: 90,
      solutions: ['Активировать карантин', 'Использовать антивирус', 'Эвакуировать лабораторию']
    }
  ]
  
  return crises[Math.floor(Math.random() * crises.length)]
}

// Добавление сообщения в чат
export function addChatMessage(gameId: string, message: any): boolean {
  const game = getGame(gameId)
  if (!game) return false
  
  game.chatHistory.push({
    ...message,
    id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString()
  })
  
  // Ограничиваем историю 200 сообщениями
  if (game.chatHistory.length > 200) {
    game.chatHistory = game.chatHistory.slice(-200)
  }
  
  updateGame(gameId, game)
  return true
}

// Обновление таймера
export function updateTimer(gameId: string, timeLeft: number): boolean {
  const game = getGame(gameId)
  if (!game) return false
  
  game.timeLeft = timeLeft
  updateGame(gameId, game)
  return true
}

// Удаление игры (для очистки)
export function deleteGame(gameId: string): boolean {
  return games.delete(gameId)
}

// Получение всех игр (для админки)
export function getAllGames(): StoredGame[] {
  return Array.from(games.values())
}