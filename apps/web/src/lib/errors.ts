// apps/web/src/lib/errors.ts
export type ErrorContext = 'login' | 'register' | 'default'

function isRecord(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v)
}

export class ApiError extends Error {
	status?: number
	code?: string
	serverMessage?: string
	userMessage: string
	cause?: unknown
	payload?: unknown

	constructor(init: {
		userMessage: string
		status?: number
		code?: string
		serverMessage?: string
		cause?: unknown
		payload?: unknown
	}) {
		super(init.userMessage)
		Object.setPrototypeOf(this, new.target.prototype)
		this.name = 'ApiError'
		this.userMessage = init.userMessage
		this.status = init.status
		this.code = init.code
		this.serverMessage = init.serverMessage
		this.cause = init.cause
		this.payload = init.payload
	}
}

export function mapToUserMessage(
	status?: number,
	serverMessage?: string,
	context: ErrorContext = 'default',
): string {
	const msg = (serverMessage || '').toLowerCase().trim()

	if (status == null || status === 0) {
		return 'Не удалось подключиться к серверу. Проверьте интернет и попробуйте ещё раз.'
	}

	if (status === 401) {
		if (context === 'login') return 'Неверный логин или пароль.'
		return 'Не авторизован. Пожалуйста, войдите в аккаунт.'
	}

	if (status === 403) return 'Доступ запрещён. Недостаточно прав.'
	if (status === 404) return 'Ничего не найдено.'
	if (status === 409) {
		if (context === 'register')
			return 'Такой email уже зарегистрирован. Попробуйте войти.'
		return 'Конфликт данных. Обновите страницу и повторите попытку.'
	}
	if (status === 422 || msg.includes('validation')) {
		return 'Проверьте правильность введённых данных.'
	}
	if (status === 429)
		return 'Слишком много попыток. Подождите немного и попробуйте снова.'
	if (status >= 500)
		return 'На сервере возникла ошибка. Уже чиним — попробуйте ещё раз позже.'

	if (msg.includes('csrf')) {
		return 'Сессия защиты истекла. Обновите страницу и повторите попытку.'
	}
	if (msg.includes('invalid credentials')) {
		return context === 'login'
			? 'Неверный логин или пароль.'
			: 'Сессия истекла или нет доступа.'
	}

	return 'Что-то пошло не так. Попробуйте ещё раз.'
}

export function getUserMessage(
	err: unknown,
	context: ErrorContext = 'default',
) {
	if (isRecord(err)) {
		if (typeof err.userMessage === 'string') return err.userMessage
		if (typeof err.message === 'string') {
			if (/failed to fetch|network/i.test(err.message)) {
				return mapToUserMessage(undefined, undefined, context)
			}
			if (err.message.length < 120) return err.message
		}
	}

	if (err instanceof Error) {
		if (/failed to fetch|network/i.test(err.message)) {
			return mapToUserMessage(undefined, undefined, context)
		}
		if (err.message.length < 120) return err.message
	}

	return mapToUserMessage(undefined, undefined, context)
}
