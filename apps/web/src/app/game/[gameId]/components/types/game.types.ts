// apps/web/src/app/game/[gameId]/types/game.types.ts

export type CardType =
  | 'profession'
  | 'health'
  | 'trait'
  | 'secret'
  | 'role'
  | 'resource'
  | 'gender'
  | 'age'
  | 'body'

export type CardDetails = {
  id: string
  name: string
  description: string
  pros?: string[]
  cons?: string[]
  effects?: string[]
  goal?: string
  abilities?: string[]
  bonuses?: string[]
  range?: string
  specialAbility?: string
  winCondition?: string
}

export type CrisisInfo = {
  id: string
  name: string
  description: string
  type: string
  penalty: string
  isActive: boolean
  priorityProfessions?: string[]
}

export type GamePhase =
  | 'introduction'
  | 'preparation'
  | 'discussion'
  | 'voting'
  | 'reveal'
  | 'crisis'
  | 'intermission'
  | 'game_over'

export interface GameChatMessage {
  id: string
  playerId: string
  playerName: string
  text: string
  type: 'player' | 'system'
  timestamp: Date
}

export interface PlayerCardInfo {
  playerId: string
  playerName: string
  revealedCards: Record<string, { name: string; type: string; cardId: string }>
}

export type RevealedCardInfo = {
  name: string
  type: string
  id?: string
}

export type GamePlayer = {
  id: string
  name: string
  isAlive: boolean
  vote?: string
  votesAgainst?: number
  profession?: string
  avatar?: string
  score?: number
  revealedCards?: number
  revealedCardsInfo?: Record<string, RevealedCardInfo>
}

export type GameStatus = 'waiting' | 'running' | 'finished'

export type GameState = {
  status?: GameStatus | string
  phase?: GamePhase
  phaseEndTime?: string
  phaseDuration?: number
  players?: GamePlayer[]
  creatorId?: string
  currentCrisis?: CrisisInfo | null
  round?: number
  maxRounds?: number
  occupiedSlots?: number
  capsuleSlots?: number
  [key: string]: unknown
}

export type GameResults = {
  winners: string[]
  reason?: string
  scores?: unknown
} | null

export type RevealedPlayer = {
  name: string
  cards: Record<string, Partial<CardDetails> | null>
  playerId?: string
} | null

export type WsMessage = { type: string; [key: string]: unknown }