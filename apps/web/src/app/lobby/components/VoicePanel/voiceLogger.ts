type VoiceLogPrefix = '[VoiceChat]' | '[LiveKit]' | '[AudioStream]'

type VoiceLogLevel = 'info' | 'warn' | 'error'

export type VoiceLogDetails = {
	roomName?: unknown
	participantIdentity?: unknown
	participantName?: unknown
	trackSid?: unknown
	trackKind?: unknown
	trackSource?: unknown
	errorName?: unknown
	errorMessage?: unknown
}

const VOICE_LOGS_ENABLED = true // демонстрационный режим для защиты

const browserCrypto =
	typeof globalThis !== 'undefined' ? globalThis.crypto : undefined

const voiceSessionId =
	browserCrypto && 'randomUUID' in browserCrypto
		? browserCrypto.randomUUID().slice(0, 8)
		: Math.random().toString(36).slice(2, 10)

const sessionStartedAt = Date.now()

let eventCounter = 0

const PREFIX_STYLES: Record<VoiceLogPrefix, string> = {
	'[VoiceChat]': [
		'background:#20e3ff',
		'color:#041a22',
		'font-weight:700',
		'padding:2px 8px',
		'border-radius:4px',
		'border:1px solid #8cf5ff',
	].join(';'),
	'[LiveKit]': [
		'background:#4d7dff',
		'color:#f8fbff',
		'font-weight:700',
		'padding:2px 8px',
		'border-radius:4px',
		'border:1px solid #91b2ff',
	].join(';'),
	'[AudioStream]': [
		'background:#0ea5c6',
		'color:#f4feff',
		'font-weight:700',
		'padding:2px 8px',
		'border-radius:4px',
		'border:1px solid #7ee7ff',
	].join(';'),
}

const MESSAGE_STYLES: Record<VoiceLogLevel, string> = {
	info: ['color:#9be7ff', 'font-weight:700', 'background:transparent'].join(
		';',
	),
	warn: ['color:#ffd76a', 'font-weight:700', 'background:transparent'].join(
		';',
	),
	error: ['color:#ff7b9c', 'font-weight:700', 'background:transparent'].join(
		';',
	),
}

function safeText(value: unknown): string {
	if (value === null || value === undefined) return ''

	const text =
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
			? String(value)
			: ''

	return text
		.trim()
		.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [hidden]')
		.replace(
			/(token|accessToken|refreshToken|authToken|jwt)=([^&\s]+)/gi,
			'$1=[hidden]',
		)
		.slice(0, 300)
}

function getErrorDetails(error: unknown): VoiceLogDetails {
	if (error instanceof Error) {
		return {
			errorName: error.name,
			errorMessage: error.message,
		}
	}

	if (typeof error === 'string') {
		return {
			errorMessage: error,
		}
	}

	if (error === undefined || error === null) {
		return {}
	}

	return {
		errorMessage: 'Неизвестная ошибка',
	}
}

function addField(
	table: Record<string, string | number>,
	title: string,
	value: unknown,
) {
	const safeValue = safeText(value)

	if (safeValue) {
		table[title] = safeValue
	}
}

function getLevelLabel(level: VoiceLogLevel) {
	if (level === 'error') return 'Ошибка'
	if (level === 'warn') return 'Предупреждение'
	return 'Успешно'
}

function buildTable(
	prefix: VoiceLogPrefix,
	message: string,
	level: VoiceLogLevel,
	details: VoiceLogDetails = {},
	eventNumber: number,
) {
	const table: Record<string, string | number> = {
		'Номер события': eventNumber,
		Статус: getLevelLabel(level),
		Компонент: prefix,
		Событие: message,
		'Сессия логов': voiceSessionId,
		'Время сессии': `${Date.now() - sessionStartedAt} ms`,
		'Время ISO': new Date().toISOString(),
		'Время локальное': new Date().toLocaleString('ru-RU'),
	}

	addField(table, 'Комната', details.roomName)
	addField(table, 'Участник ID', details.participantIdentity)
	addField(table, 'Имя участника', details.participantName)
	addField(table, 'Track SID', details.trackSid)
	addField(table, 'Тип track', details.trackKind)
	addField(table, 'Источник track', details.trackSource)
	addField(table, 'Тип ошибки', details.errorName)
	addField(table, 'Сообщение ошибки', details.errorMessage)

	return table
}

function write(
	prefix: VoiceLogPrefix,
	message: string,
	level: VoiceLogLevel = 'info',
	details?: VoiceLogDetails,
) {
	if (!VOICE_LOGS_ENABLED) return
	if (typeof console === 'undefined') return

	eventCounter += 1

	const eventNumber = eventCounter
	const eventNumberLabel = String(eventNumber).padStart(3, '0')
	const table = buildTable(prefix, message, level, details, eventNumber)

	try {
		console.groupCollapsed(
			`%c${prefix}%c #${eventNumberLabel} ${message}`,
			PREFIX_STYLES[prefix],
			MESSAGE_STYLES[level],
		)
		console.table(table)
	} finally {
		console.groupEnd()
	}
}

export const voiceLogger = {
	roomConnected(details?: VoiceLogDetails) {
		write(
			'[VoiceChat]',
			'Подключение к голосовой комнате выполнено',
			'info',
			details,
		)
	},

	roomDisconnected(details?: VoiceLogDetails) {
		write(
			'[VoiceChat]',
			'Отключение от голосовой комнаты выполнено',
			'info',
			details,
		)
	},

	participantConnected(details?: VoiceLogDetails) {
		write(
			'[VoiceChat]',
			'Участник подключился к голосовой комнате',
			'info',
			details,
		)
	},

	participantDisconnected(details?: VoiceLogDetails) {
		write(
			'[VoiceChat]',
			'Участник отключился от голосовой комнаты',
			'info',
			details,
		)
	},

	localMicrophoneEnabled(details?: VoiceLogDetails) {
		write('[LiveKit]', 'Локальный микрофон успешно включен', 'info', details)
	},

	localMicrophoneDisabled(details?: VoiceLogDetails) {
		write('[LiveKit]', 'Локальный микрофон выключен', 'info', details)
	},

	localTrackPublished(details?: VoiceLogDetails) {
		write('[LiveKit]', 'Локальный audio track опубликован', 'info', details)
	},

	localTrackUnpublished(details?: VoiceLogDetails) {
		write(
			'[LiveKit]',
			'Локальный audio track снят с публикации',
			'info',
			details,
		)
	},

	localTrackStopped(details?: VoiceLogDetails) {
		write('[AudioStream]', 'Локальный audio track остановлен', 'info', details)
	},

	remoteTrackSubscribed(details?: VoiceLogDetails) {
		write(
			'[AudioStream]',
			'Получен remote audio track от другого участника',
			'info',
			details,
		)
	},

	remoteTrackUnsubscribed(details?: VoiceLogDetails) {
		write(
			'[AudioStream]',
			'Remote audio track больше не доступен',
			'info',
			details,
		)
	},

	audioAttached(details?: VoiceLogDetails) {
		write(
			'[AudioStream]',
			'Аудиопоток привязан к воспроизведению',
			'info',
			details,
		)
	},

	audioDetached(details?: VoiceLogDetails) {
		write(
			'[AudioStream]',
			'Аудиопоток отвязан от воспроизведения',
			'info',
			details,
		)
	},

	audioPlaybackReady(details?: VoiceLogDetails) {
		write('[AudioStream]', 'Воспроизведение аудио разрешено', 'info', details)
	},

	audioPlaybackBlocked(details?: VoiceLogDetails) {
		write(
			'[AudioStream]',
			'Браузер заблокировал автоматическое воспроизведение аудио',
			'warn',
			details,
		)
	},

	error(message: string, error: unknown, details?: VoiceLogDetails) {
		write('[VoiceChat]', message, 'error', {
			...details,
			...getErrorDetails(error),
		})
	},

	liveKitError(message: string, error: unknown, details?: VoiceLogDetails) {
		write('[LiveKit]', message, 'error', {
			...details,
			...getErrorDetails(error),
		})
	},

	audioError(message: string, error: unknown, details?: VoiceLogDetails) {
		write('[AudioStream]', message, 'error', {
			...details,
			...getErrorDetails(error),
		})
	},
}

export function getParticipantLogData(participant: unknown): VoiceLogDetails {
	if (!participant || typeof participant !== 'object') return {}

	const p = participant as {
		identity?: unknown
		name?: unknown
	}

	return {
		participantIdentity: p.identity,
		participantName: p.name,
	}
}

export function getTrackLogData(track: unknown): VoiceLogDetails {
	if (!track || typeof track !== 'object') return {}

	const t = track as {
		sid?: unknown
		trackSid?: unknown
		kind?: unknown
		source?: unknown
	}

	return {
		trackSid: t.sid ?? t.trackSid,
		trackKind: t.kind,
		trackSource: t.source,
	}
}

export function getPublicationLogData(publication: unknown): VoiceLogDetails {
	if (!publication || typeof publication !== 'object') return {}

	const p = publication as {
		trackSid?: unknown
		sid?: unknown
		kind?: unknown
		source?: unknown
	}

	return {
		trackSid: p.trackSid ?? p.sid,
		trackKind: p.kind,
		trackSource: p.source,
	}
}
