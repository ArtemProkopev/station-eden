import { User } from '@station-eden/shared'

// Эти типы чисто визуальные (какие иконки активны, открыта ли модалка),
// поэтому они остаются на фронтенде.
export interface ProfileIconsStatus {
	planet: boolean
	polygon: boolean
	copy: boolean
}

export interface ProfileModalState {
	isOpen: boolean
}

/**
 * Состояние профиля для UI.
 * Мы не дублируем поля username/email, а используем тип User из общего пакета.
 */
export interface ProfileState {
	status: 'loading' | 'error' | 'ok' | 'unauth'
	message?: string
	// Данные пользователя (могут отсутствовать, если загрузка или ошибка)
	data?: User
}
