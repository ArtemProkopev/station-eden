// apps/web/src/lib/flags.ts

/**
 * Преобразует строку из env к boolean.
 * Поддерживает: true/1/yes/on и false/0/no/off (регистронезависимо).
 * Возвращает undefined, если распознать нельзя.
 */
function toBool(raw: string | undefined | null): boolean | undefined {
	if (!raw) return undefined
	const v = raw.trim().toLowerCase()
	if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true
	if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false
	return undefined
}

/**
 * Публичные флаги должны быть статичными, чтобы Next.js их инлайнил.
 * В dev — дефолт true, в prod — дефолт false.
 */
const isDev = process.env.NODE_ENV !== 'production'

export const GOOGLE_ENABLED =
	toBool(process.env.NEXT_PUBLIC_ENABLE_GOOGLE) ?? (isDev ? true : false)

export const API_BASE =
	process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
