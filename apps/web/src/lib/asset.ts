// apps/web/src/lib/asset.ts
// Единая нормализация публичных ссылок на ассеты

// Основной красивый домен для ассетов (может быть пустым на раннем этапе деплоя)
export const PRIMARY = (process.env.NEXT_PUBLIC_ASSETS_BASE || '').replace(
	/\/+$/,
	''
)

// ВАЖНО: домен БАКЕТА (vhost), а не project endpoint
export const FALLBACK = 'https://station-eden-media.s3.ru-1.storage.selcloud.ru'

const IS_PROD = process.env.NODE_ENV === 'production'

/** Абсолютный CDN-URL по ключу/относительному пути */
export function asset(rel: string): string {
	if (!rel) return rel as unknown as string
	if (!rel.startsWith('/')) rel = '/' + rel
	const base = PRIMARY || FALLBACK
	return `${base}/web${rel}`
}

/** Любой наш путь /web/* → CDN (перепишет selstorage/origin/относительные) */
function toCdn(u: string): string {
	try {
		const url = new URL(u, 'https://stationeden.ru') // base для относительных
		if (url.pathname.startsWith('/web/')) {
			return new URL(url.pathname, PRIMARY || FALLBACK).toString()
		}
	} catch {
		// строка без протокола — возможно, ключ
	}
	if (/^\/?web\//.test(u)) {
		const path = u.startsWith('/') ? u : `/${u}`
		return new URL(path, PRIMARY || FALLBACK).toString()
	}
	return u
}

/** Переключиться на селстор только если CDN не загрузился (onError) */
function onImgErrorSwapToFallback(
	e: React.SyntheticEvent<HTMLImageElement>
) {
	const img = e.currentTarget
	if (PRIMARY) {
		try {
			const primaryOrigin = new URL(PRIMARY).origin
			img.src = img.src.replace(primaryOrigin, FALLBACK)
		} catch {
			/* ignore */
		}
	}
}

// (опционально) сигнализировать о неверной конфигурации в проде
function assertPrimaryInProd() {
	if (IS_PROD && !PRIMARY) {
		// eslint-disable-next-line no-console
		console.error('[asset] NEXT_PUBLIC_ASSETS_BASE is empty in production!')
	}
}