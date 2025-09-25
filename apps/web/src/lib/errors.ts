// apps/web/src/lib/errors.ts

export type ErrorContext = 'login' | 'register' | 'default'

export class ApiError extends Error {
	status?: number
	code?: string
	serverMessage?: string
	userMessage: string
	cause?: unknown

	constructor(init: {
		userMessage: string
		status?: number
		code?: string
		serverMessage?: string
		cause?: unknown
	}) {
		super(init.userMessage)
		Object.setPrototypeOf(this, new.target.prototype)
		this.name = 'ApiError'
		this.userMessage = init.userMessage
		this.status = init.status
		this.code = init.code
		this.serverMessage = init.serverMessage
		this.cause = init.cause
	}
}

/** Дружелюбные тексты по статусу/сообщению бэка (учитываем контекст экрана). */
export function mapToUserMessage(
	status?: number,
	serverMessage?: string,
	context: ErrorContext = 'default'
): string {
	const msg = (serverMessage || '').toLowerCase().trim()

	if (status == null || status === 0) {
		return 'Не удалось подключиться к серверу. Проверьте интернет и попробуйте ещё раз.'
	}

	if (status === 401) {
		if (context === 'login') return 'Неверный email или пароль.'
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

	// эвристики по тексту
	if (msg.includes('csrf')) {
		return 'Сессия защиты истекла. Обновите страницу и повторите попытку.'
	}
	if (msg.includes('invalid credentials')) {
		return context === 'login'
			? 'Неверный email или пароль.'
			: 'Сессия истекла или нет доступа.'
	}

	return 'Что-то пошло не так. Попробуйте ещё раз.'
}

/** Достаёт человекочитаемый текст из любого error-объекта. */
export function getUserMessage(
	err: unknown,
	context: ErrorContext = 'default'
) {
	if (err && typeof err === 'object') {
		const anyErr = err as any
		if (typeof anyErr.userMessage === 'string') return anyErr.userMessage
		if (typeof anyErr.message === 'string') {
			// сетевые/Fetch сообщения
			if (/failed to fetch|network/i.test(anyErr.message)) {
				return mapToUserMessage(undefined, undefined, context)
			}
			if (anyErr.message.length < 120) return anyErr.message
		}
	}
	return mapToUserMessage(undefined, undefined, context)
}
