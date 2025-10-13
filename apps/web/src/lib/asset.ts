// apps/web/src/lib/asset.ts

// Основной красивый домен для ассетов (может быть пустым на раннем этапе деплоя)
export const PRIMARY = (process.env.NEXT_PUBLIC_ASSETS_BASE || '').replace(
	/\/+$/,
	''
)

// ВАЖНО: домен БАКЕТА (vhost), а не project endpoint
export const FALLBACK = 'https://station-eden-media.s3.ru-1.storage.selcloud.ru'

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
