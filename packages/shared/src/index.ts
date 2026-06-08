// packages/shared/src/index.ts
import { z } from 'zod'

// ==============================================================================
// ZOD GLOBAL ERROR MAP (глушим дефолтные сообщения)
// ==============================================================================
z.setErrorMap(() => ({ message: '' }))

// ==============================================================================
// COMMON
// ==============================================================================
export type ISODateString = string

// ==============================================================================
// AUTH
// ==============================================================================
export const LoginSchema = z.object({
	login: z.string().trim().min(1),
	password: z.string().min(1),
})
export type LoginDto = z.infer<typeof LoginSchema>

export const RegisterSchema = z.object({
	email: z.string().email(),
	username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/),
	password: z.string().min(8).max(72),
})
export type RegisterDto = z.infer<typeof RegisterSchema>

export const ClientRegisterSchema = RegisterSchema.extend({
	confirm: z.string().min(1),
}).refine(d => d.password === d.confirm, { path: ['confirm'] })
export type ClientRegisterForm = z.infer<typeof ClientRegisterSchema>

export interface User {
	id: string
	email: string
	username: string | null
	avatar?: string | null
	frame?: string | null
}

export interface UserData extends User {
	token: string
}

export interface LoginResponse {
	mfa?: string
	email?: string
	needSetPassword?: boolean
	user?: User
	id?: string
	token?: string
	access_token?: string
	username?: string | null
	avatar?: string | null
	frame?: string | null
}

export interface ServerLockInfo {
	lockedMinutes?: number
	lockedUntil?: ISODateString
	attemptsLeft?: number
}

export interface LockPayload {
	login: string
	lockedUntilIso: ISODateString
}

// ==============================================================================
// LOBBY / GAME
// ==============================================================================
export const LobbyVisibilitySchema = z.enum([
	'public',
	'password',
	'hidden_password',
])

export type LobbyVisibility = z.infer<typeof LobbyVisibilitySchema>

export const CreateLobbySchema = z
	.object({
		visibility: LobbyVisibilitySchema.default('public'),
		password: z.string().trim().max(72).optional(),
	})
	.superRefine((data, ctx) => {
		const needsPassword =
			data.visibility === 'password' || data.visibility === 'hidden_password'

		if (!needsPassword) return

		if (!data.password || data.password.trim().length < 4) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['password'],
				message: 'Пароль должен содержать минимум 4 символа',
			})
		}
	})

export type CreateLobbyDto = z.infer<typeof CreateLobbySchema>

export interface CreateLobbyResponse {
	lobbyId: string
	visibility: LobbyVisibility
	hasPassword: boolean
	inviteCode?: string
}

export interface PublicLobbyInfo {
	lobbyId: string
	playersCount: number
	maxPlayers: number
	gameMode: string
	visibility: Exclude<LobbyVisibility, 'hidden_password'>
	hasPassword: boolean
	searchingPlayers?: boolean
	difficulty?: 'easy' | 'normal' | 'hard'
	turnTime?: number
	hiddenRolesCount?: number
	enableCrises?: boolean
	createdAt: ISODateString
}
export interface LobbySettings {
	maxPlayers: number
	gameMode: string
	isPrivate: boolean
	visibility?: LobbyVisibility
	hasPassword?: boolean
	password?: string
	difficulty?: 'easy' | 'normal' | 'hard'
	turnTime?: number
	fastGame?: boolean
	tournamentMode?: boolean
	limitedResources?: boolean
	searchingPlayers?: boolean

	maxRounds?: number
	discussionTime?: number
	votingTime?: number
	hiddenRolesCount?: number
	enableCrises?: boolean
}

export interface LobbyPlayer {
	id: string
	name: string
	missions: number
	hours: number
	avatar?: string
	isReady: boolean
}

export interface ChatMessage {
	id: string
	playerId: string
	playerName: string
	text: string
	timestamp: Date | ISODateString
	type?: 'system' | 'player'
}

export interface GameSettings {
	gameMode: string
	difficulty?: 'easy' | 'normal' | 'hard'
	turnTime?: number
	maxRounds?: number
	discussionTime?: number
	votingTime?: number
	hiddenRolesCount?: number
	enableCrises?: boolean
	tournamentMode?: boolean
}

export interface GamePlayer {
	id: string
	name: string
	avatar?: string
	score: number
	isActive: boolean
	order: number
}

export interface GameState {
	id: string
	lobbyId: string
	status: 'waiting' | 'active' | 'finished' | 'cancelled'
	players: GamePlayer[]
	currentPlayerId?: string
	round: number
	maxRounds?: number
	startedAt?: ISODateString
	finishedAt?: ISODateString
	winnerId?: string
	settings: GameSettings
}

// ==============================================================================
// WEBSOCKETS
// ==============================================================================
export type WebSocketMessageType =
	| 'JOIN_LOBBY'
	| 'PLAYER_JOINED'
	| 'PLAYER_LEFT'
	| 'CHAT_MESSAGE'
	| 'SEND_MESSAGE'
	| 'LOBBY_STATE'
	| 'LOBBY_LOCKED'
	| 'PLAYER_READY'
	| 'TOGGLE_READY'
	| 'UPDATE_LOBBY_SETTINGS'
	| 'LOBBY_SETTINGS_UPDATED'
	| 'START_GAME'
	| 'GAME_STARTED'
	| 'GAME_STATE'
	| 'GAME_UPDATE'
	| 'PLAYER_LEFT_GAME'
	| 'GAME_ACTION'
	| 'ERROR'

export interface WebSocketMessage<T = unknown> {
	type: WebSocketMessageType
	payload: T
}

export interface StartGameMessage {
	lobbyId: string
	creatorId: string
}

export interface GameStartedMessage {
	gameId: string
	redirectUrl: string
	gameState: GameState
}

export interface GameStateMessage {
	gameState: GameState
}

// ==============================================================================
// NOTIFICATIONS
// ==============================================================================
export type NotificationType =
	| 'news'
	| 'game_invite'
	| 'system'
	| 'friend_request'

export interface BaseNotification {
	id: string
	type: NotificationType
	title: string
	message: string
	timestamp: Date | ISODateString
	isRead: boolean
}

export interface NewsNotification extends BaseNotification {
	type: 'news'
	link?: string
}

export interface GameInviteNotification extends BaseNotification {
	type: 'game_invite'
	lobbyId: string
	inviterName: string
	inviterId: string
	gameMode: string
}

export interface SystemNotification extends BaseNotification {
	type: 'system'
}

export interface FriendRequestNotification extends BaseNotification {
	type: 'friend_request'
	requesterId: string
	requesterName: string
}

export type Notification =
	| NewsNotification
	| GameInviteNotification
	| SystemNotification
	| FriendRequestNotification

// ==============================================================================
// SETTINGS / FRIENDS
// ==============================================================================
export interface SoundSettings {
	masterVolume: number
	musicVolume: number
	effectsVolume: number
	outputDevice: string
	muteWhenMinimized: boolean
}

export interface UserSettings {
	sound: SoundSettings
	language: string
	sessionHistory: boolean
	purchaseHistory: boolean
}

export interface Friend {
	id: string
	username: string
	email: string
	avatar?: string
	status: 'online' | 'offline' | 'away' | 'in_game'
	lastSeen?: Date | ISODateString
	isFavorite?: boolean
}

export interface FriendsState {
	friends: Friend[]
	pendingRequests: FriendRequestNotification[]
	isLoading: boolean
}

// ==============================================================================
// GAME TYPES (добавлено из game.types.ts)
// ==============================================================================
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

export interface CardDetails {
	id: string
	name: string
	description: string
	type?: string
	pros?: string[]
	cons?: string[]
	effects?: string[]
	goal?: string
	abilities?: string[]
	bonuses?: string[]
	range?: string
	effect?: string
	specialAbility?: string
	winCondition?: string
}

export interface CrisisInfo {
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
	revealedCards: Record<string, CardDetails>
}

export interface RevealedCardInfo extends CardDetails {
	type: string
}

export interface ExtendedGamePlayer extends GamePlayer {
	isAlive: boolean
	vote?: string
	votesAgainst?: number
	profession?: string
	revealedCards?: number
	revealedCardsInfo?: Record<string, RevealedCardInfo>
	revealedCardsThisRound?: string[]
	isCaptain?: boolean
	isSeniorOfficer?: boolean
	isInfected?: boolean
	isSuspicious?: boolean
	hasUsedAbility?: boolean
}

export interface ExtendedGameState extends GameState {
	phase?: GamePhase
	phaseEndTime?: string
	phaseDuration?: number
	creatorId?: string
	currentCrisis?: CrisisInfo | null
	occupiedSlots?: number
	capsuleSlots?: number
	voteTriggerCount?: number
	voteRequestPlayerIds?: string[]
	requiredVotes?: number
	introSkipProgress?: {
		skippedCount: number
		playersCount: number
	}
	currentSpeakerId?: string
	currentRevealPlayerId?: string
	revealQueue?: string[]
	[key: string]: unknown
}

export interface GameResults {
	winners: string[]
	reason?: string
	scores?: unknown
	finalScores?: Array<{
		id: string
		name: string
		score: number
		survived: boolean
		role: string
	}>
}

export type RevealedPlayer = {
	name: string
	cards: Record<string, Partial<CardDetails> | null>
	playerId?: string
} | null

export interface WsMessage {
	type: string
	[key: string]: unknown
}
