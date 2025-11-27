// @station-eden/shared - дополняем существующий файл
import { z } from 'zod'

// ==============================================================================
// 1. AUTH & USERS (Авторизация и Пользователи)
// ==============================================================================

/**
 * Схема для Входа (Login)
 * Объединяет требования API: поле login (email или username) и password
 */
export const LoginSchema = z.object({
	login: z.string().min(1, 'Введите email или имя пользователя'),
	password: z.string().min(1, 'Введите пароль'),
})

/**
 * Схема для Регистрации (Register)
 * Перенесли валидацию из API (class-validator) в Zod
 */
export const RegisterSchema = z.object({
	email: z.string().email('Некорректный формат email'),
	username: z
		.string()
		.regex(
			/^[a-zA-Z0-9_]{3,20}$/,
			"Username: 3–20 символов, латиница, цифры или '_'"
		),
	password: z
		.string()
		.min(8, 'Пароль должен быть не менее 8 символов')
		.max(72, 'Пароль слишком длинный'),
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
	timestamp: Date | string // String, т.к. по сети даты летают строками
	type?: 'system' | 'player'
}

// ==============================================================================
// 3. WEBSOCKETS & SYSTEM
// ==============================================================================

export interface WebSocketMessage<T = any> {
	type: string
	payload: T
}

// ==============================================================================
// 4. NOTIFICATIONS (Уведомления)
// ==============================================================================

export type NotificationType = 'news' | 'game_invite' | 'system' | 'friend_request'

export interface BaseNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
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
// 6. CLIENT-SPECIFIC TYPES (Дополнения для клиента)
// ==============================================================================

/**
 * Расширенная схема регистрации для клиента (добавляем confirm password)
 */
export const ClientRegisterSchema = RegisterSchema.extend({
  confirm: z.string().min(1, 'Подтверждение пароля обязательно'),
}).refine(data => data.password === data.confirm, {
  message: 'Пароли не совпадают',
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
  lockedUntilIso: string
}

/**
 * Информация о блокировке от сервера
 */
export interface ServerLockInfo {
  lockedMinutes?: number
  lockedUntil?: string
  attemptsLeft?: number
}
