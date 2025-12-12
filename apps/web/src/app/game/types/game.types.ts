export type GamePhase = 
  | 'preparation' 
  | 'discussion' 
  | 'voting' 
  | 'reveal' 
  | 'crisis'

export type CardType = 
  | 'profession' 
  | 'health' 
  | 'psychology' 
  | 'secret' 
  | 'baggage' 
  | 'role' 
  | 'gender' 
  | 'age' 
  | 'body'

export interface Card {
  id: string
  type: CardType
  title: string
  description: string
  bonus?: string
  penalty?: string
  ability?: string
  isRevealed: boolean
}

export interface GamePlayer {
  id: string
  username: string
  avatar?: string | null 
  cards: Card[]
  isAlive: boolean
  isInCapsule: boolean
  votedFor?: string
  hasRevealedCard: boolean
  role?: string
}

export interface Crisis {
  id: string
  type: 'technological' | 'biological' | 'external'
  title: string
  description: string
  priority: string[]
  penalty: string
  duration: number
  solutions: string[]
}

export interface Vote {
  voterId: string
  targetPlayerId: string
  timestamp: Date
}

export interface GameState {
  id: string
  phase: GamePhase
  round: number
  players: GamePlayer[]
  currentCrisis: Crisis | null
  timeLeft: number
  votes: Record<string, string>
  revealedCards: Record<string, Card[]>
  startTime: Date
}