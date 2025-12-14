// apps/api/src/game/types/game.types.ts

// Основные типы карт
export type Profession = {
  id: string
  name: string
  description: string
  pros: string[]
  cons: string[]
  priority: string[] // типы кризисов, где профессия полезна
}

export type HealthStatus = {
  id: string
  name: string
  description: string
  effects: string[]
  hidden?: boolean // некоторые состояния могут быть скрыты
}

export type PsychologicalTrait = {
  id: string
  name: string
  description: string
  effects: string[]
  triggers: string[] // ситуации, когда триггерится
}

export type Secret = {
  id: string
  name: string
  description: string
  goal: string
  abilities: string[]
  isHiddenRole: boolean
}

export type Resource = {
  id: string
  name: string
  description: string
  effect: string
  occupiesSpace: boolean // занимает место в капсуле
}

export type HiddenRole = {
  id: string
  name: string
  description: string
  goal: string
  abilities: string[]
  winCondition: string
}

export type RoleCard = {
  id: string
  name: string
  description: string
  specialAbility: string
}

export type Gender = {
  id: string
  name: string
  bonuses: string[]
}

export type Age = {
  id: string
  name: string
  range: string
  effects: string[]
}

export type BodyType = {
  id: string
  name: string
  effects: string[]
}

// Игрок в контексте игры
export type GamePlayer = {
  id: string
  name: string
  avatar?: string
  isActive: boolean
  isAlive: boolean
  order: number
  score: number
  vote?: string // за кого проголосовал
  
  // Характеристики игрока
  profession?: Profession
  healthStatus?: HealthStatus
  psychologicalTrait?: PsychologicalTrait
  secret?: Secret
  resource?: Resource
  hiddenRole?: HiddenRole
  roleCard?: RoleCard
  gender?: Gender
  age?: Age
  bodyType?: BodyType
  
  // Состояние игрока
  isInfected?: boolean
  isSuspicious?: boolean
  votesAgainst: number
  isCaptain?: boolean
  isSeniorOfficer?: boolean
}

// Кризис
export type Crisis = {
  id: string
  type: 'technological' | 'biological' | 'external'
  name: string
  description: string
  priorityProfessions: string[] // ID профессий
  penalty: string
  isActive: boolean
  solvedBy?: string // ID игрока, который решил кризис
}

// Фаза игры
export type GamePhase = 
  | 'introduction'    // Заставка
  | 'preparation'     // Подготовка (раздача карт)
  | 'discussion'      // Обсуждение
  | 'voting'          // Голосование
  | 'reveal'          // Раскрытие
  | 'crisis'          // Кризис
  | 'intermission'    // Между раундами
  | 'game_over'       // Конец игры

// Настройки игры
export type GameSettings = {
  gameMode: string
  maxPlayers: number
  maxRounds: number
  discussionTime: number // в секундах
  votingTime: number    // в секундах
  hiddenRolesCount: number // количество скрытых ролей
  enableCrises: boolean
  difficulty: 'easy' | 'normal' | 'hard'
}

// Состояние игры
export type GameState = {
  id: string
  lobbyId: string
  status: 'active' | 'finished' | 'cancelled'
  phase: GamePhase
  players: GamePlayer[]
  currentPlayerId: string
  round: number
  maxRounds: number
  startedAt: string
  finishedAt?: string
  winnerId?: string
  settings: GameSettings
  
  // Игровые данные
  deck: {
    professions: Profession[]
    healthStatuses: HealthStatus[]
    psychologicalTraits: PsychologicalTrait[]
    secrets: Secret[]
    resources: Resource[]
    hiddenRoles: HiddenRole[]
    roleCards: RoleCard[]
  }
  
  currentCrisis?: Crisis
  votingResults?: Map<string, number> // playerId -> количество голосов
  ejectedPlayers: string[] // ID выбывших игроков
  capsuleSlots: number // количество мест в капсуле
  occupiedSlots: number // занятые места
  crisisHistory: Crisis[]
  
  // Таймеры
  phaseEndTime?: string // когда заканчивается текущая фаза
  phaseDuration: number // длительность фазы в секундах
}