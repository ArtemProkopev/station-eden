// apps/web/src/utils/serverInfoParser.ts
import { ServerLockInfo } from '@station-eden/shared'

function isRecord(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v)
}

export function parseServerInfo(err: unknown): ServerLockInfo {
	const text =
		(isRecord(err) &&
			(typeof err.message === 'string'
				? err.message
				: typeof err.error === 'string'
					? err.error
					: isRecord(err.response) && isRecord(err.response.data)
						? (err.response.data.message as unknown)
						: isRecord(err.response) && typeof err.response.data === 'string'
							? err.response.data
							: undefined)) ??
		(isRecord(err) ? JSON.stringify(err) : '') ??
		''

	const t = String(text ?? '')

	const lockMinutesMatch = t.match(/locked for\s+(\d+)\s+minutes/i)
	if (lockMinutesMatch) {
		const num = Number(lockMinutesMatch[1])
		if (!Number.isNaN(num)) return { lockedMinutes: num }
	}

	const untilIsoMatch =
		t.match(/blocked until\s+([\d\-\wT:.Z]+)/i) ||
		t.match(/locked until\s+([\d\-\wT:.Z]+)/i)
	if (untilIsoMatch) {
		const parsed = Date.parse(untilIsoMatch[1])
		if (!Number.isNaN(parsed))
			return { lockedUntil: new Date(parsed).toISOString() }
	}

	const attemptsMatch =
		t.match(/Attempts left[:\s]*([0-9]+)/i) ||
		t.match(/attempts left[:\s]*([0-9]+)/i)
	if (attemptsMatch) return { attemptsLeft: Number(attemptsMatch[1]) }

	const payload = isRecord(err) && 'payload' in err ? err.payload : undefined

	const data =
		payload ??
		(isRecord(err) && isRecord(err.response) ? err.response.data : undefined)

	if (isRecord(data)) {
		if (typeof data.minutesLeft === 'number')
			return { lockedMinutes: data.minutesLeft }
		if (typeof data.attemptsLeft === 'number')
			return { attemptsLeft: data.attemptsLeft }
		if (typeof data.lockedUntil === 'string')
			return { lockedUntil: data.lockedUntil }
	}

	return {}
}
