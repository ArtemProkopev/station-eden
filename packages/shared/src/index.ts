// packages/shared/src/index.ts
// @station-eden/shared - дополняем существующий файл
import { z } from 'zod'

// ==============================================================================
// 0. ZOD GLOBAL ERROR MAP (убираем дефолтные сообщения валидации)
// ==============================================================================

z.setErrorMap(() => {
	// Возвращаем пустую строку — UI получает факт ошибки, но без текста
	return { message: '' }
})

// ==============================================================================
// 0. COMMON TYPES
// ==============================================================================

/**
 * Строка с датой в формате ISO (для полей, которые приходят/уходят по сети как string)
 */
export type ISODateString = string

// ==============================================================================
// 1. AUTH & USERS (Авторизация и Пользователи)
// ==============================================================================

/**
 * Схема для Входа (Login)
 * Минимальная валидация, сообщения нам не нужны — ошибки под полями не показываем.
 */
export const LoginSchema = z.object({
	login: z.string().trim().min(1),
	password: z.string().min(1),
})

/**
 * Схема для Регистрации (Register)
 * Перенесли валидацию из API (class-validator) в Zod.
 * Сообщения валидации глобально глушатся через setErrorMap.
 */
export const RegisterSchema = z.object({
	email: z.string().email(),
	username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/),
	password: z.string().min(8).max(72),
})

// Генерируем TypeScript типы из схем
export type LoginDto = z.infer<typeof LoginSchema>
export type RegisterDto = z.infer<typeof RegisterSchema>

/**
 * Базовый интерфейс пользователя (то, что приходит с бэкенда)
 * Очищен от UI-статусов (loading/error), только данные.
 */
export interface User {
	id: string
	email: string
	username: string
	avatar?: string
	frame?: string
}

// ==============================================================================
// 2. LOBBY & GAME (Лобби и Игра)
// ==============================================================================

/**
 * Настройки лобби
 * Используем interface, так как валидация тут сложнее или пока не нужна строго
 */
export interface LobbySettings {
	maxPlayers: number
	gameMode: string
	isPrivate: boolean
	password?: string // Сделал опциональным, т.к. если не приватное, пароля нет

	// Дополнительные настройки
	difficulty?: 'easy' | 'medium' | 'hard' // Лучше использовать union type вместо string
	turnTime?: string // или number (секунды), если планируешь логику
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
	timestamp: Date | ISODateString // String, т.к. по сети даты летают строками
	type?: 'system' | 'player'
}

// ==============================================================================
// 3. WEBSOCKETS & SYSTEM
// ==============================================================================

export interface WebSocketMessage<T = unknown> {
	type: string
	payload: T
}

// ==============================================================================
// 4. NOTIFICATIONS (Уведомления)
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
// 5. SETTINGS (Настройки клиента)
// ==============================================================================
// Если эти настройки хранятся ТОЛЬКО на клиенте (localStorage), их можно оставить в web.
// Но если планируешь синхронизацию с БД, то держи их здесь.

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

// ==============================================================================
// 6. FRIENDS (Друзья)
// ==============================================================================

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
// 7. CLIENT-SPECIFIC TYPES (Дополнения для клиента)
// ==============================================================================

/**
 * Расширенная схема регистрации для клиента (добавляем confirm password)
 * Сообщения валидации глобально пустые, UI сам показывает подсказки.
 */
export const ClientRegisterSchema = RegisterSchema.extend({
	confirm: z.string().min(1),
}).refine(data => data.password === data.confirm, {
	path: ['confirm'],
})

export type ClientRegisterForm = z.infer<typeof ClientRegisterSchema>

/**
 * Расширенный пользователь с токеном (для клиентского хранилища)
 */
export interface UserData extends User {
	token: string
}

/**
 * Ответ от сервера при логине
 */
export interface LoginResponse {
	mfa?: string
	email?: string
	needSetPassword?: boolean
	user?: User
	id?: string
	token?: string
	access_token?: string
	username?: string
	avatar?: string
}

/**
 * Данные блокировки аккаунта (для localStorage)
 */
export interface LockPayload {
	login: string
	lockedUntilIso: ISODateString
}

/**
 * Информация о блокировке от сервера
 */
export interface ServerLockInfo {
	lockedMinutes?: number
	lockedUntil?: ISODateString
	attemptsLeft?: number
}
