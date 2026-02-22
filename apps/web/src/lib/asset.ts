// apps/web/src/lib/asset.ts
// Единая нормализация публичных ссылок на ассеты

// Основной красивый домен для ассетов (может быть пустым на раннем этапе деплоя)
export const PRIMARY = (process.env.NEXT_PUBLIC_ASSETS_BASE || '').replace(
	/\/+$/,
	'',
)

// ВАЖНО: домен БАКЕТА (vhost), а не project endpoint
export const FALLBACK = 'https://station-eden-media.s3.ru-1.storage.selcloud.ru'

/** Абсолютный CDN-URL по ключу/относительному пути */
export function asset(rel: string): string {
	if (!rel) return rel as unknown as string
	if (!rel.startsWith('/')) rel = '/' + rel
	const base = PRIMARY || FALLBACK
	return `${base}/web${rel}`
}
