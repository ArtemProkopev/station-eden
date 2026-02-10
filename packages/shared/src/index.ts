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
export interface LobbySettings {
	maxPlayers: number
	gameMode: string
	isPrivate: boolean
	password?: string
	difficulty?: 'easy' | 'medium' | 'hard'
	turnTime?: number
	fastGame?: boolean
	tournamentMode?: boolean
	limitedResources?: boolean
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
	difficulty?: 'easy' | 'medium' | 'hard'
	turnTime?: number
	maxRounds?: number
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
