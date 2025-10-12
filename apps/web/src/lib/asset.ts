// apps/web/src/lib/asset.ts

// Основной красивый домен для ассетов (может быть пустым на раннем этапе деплоя)
export const PRIMARY = (process.env.NEXT_PUBLIC_ASSETS_BASE || '').replace(/\/+$/, '')

// UUID-домен Selectel, который всегда работает
export const FALLBACK = 'https://c8e8acb0-0b53-453b-95d1-9fdda82e2a5a.selstorage.ru'

/**
 * Делает абсолютный URL к ассету на CDN/S3.
 * Пример: asset('/avatars/a.png') -> "<BASE>/web/avatars/a.png"
 * Если useFallback=true или PRIMARY пуст — вернёт FALLBACK-базу.
 */
export function asset(rel: string, useFallback = false): string {
	if (!rel.startsWith('/')) rel = '/' + rel
	const base = useFallback || !PRIMARY ? FALLBACK : PRIMARY
	return `${base}/web${rel}`
}

/**
 * Если на входе абсолютный URL на PRIMARY — вернёт такой же на FALLBACK.
 * Нужен, если в состоянии уже лежит абсолютный URL (PRIMARY), но загрузка упала.
 */
export function toFallback(u: string): string {
	if (!PRIMARY) return u
	try {
		const p = new URL(u)
		const primaryBase = new URL(PRIMARY)
		if (p.origin === primaryBase.origin) {
			return u.replace(primaryBase.origin, FALLBACK)
		}
	} catch {
		// no-op
	}
	return u
}
