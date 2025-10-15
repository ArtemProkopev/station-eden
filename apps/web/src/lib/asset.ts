// Единая нормализация публичных ссылок на ассеты

export const PRIMARY = (process.env.NEXT_PUBLIC_ASSETS_BASE || '').replace(
	/\/+$/,
	''
)
export const FALLBACK =
	'https://c8e8acb0-0b53-453b-95d1-9fdda82e2a5a.selstorage.ru'
const IS_PROD = process.env.NODE_ENV === 'production'

/** Абсолютный CDN-URL по ключу/относительному пути */
export function asset(rel: string): string {
	if (!rel) return rel as unknown as string
	if (!rel.startsWith('/')) rel = '/' + rel
	const base = PRIMARY || FALLBACK // в проде PRIMARY обязан быть; FALLBACK только как сетевой запасной путь
	return `${base}/web${rel}`
}

/** Любой наш путь /web/* → CDN (перепишет selstorage/origin/относительные) */
export function toCdn(u: string): string {
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
export function onImgErrorSwapToFallback(
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
export function assertPrimaryInProd() {
	if (IS_PROD && !PRIMARY) {
		// можно подключить метрику/логгер/сентри
		// eslint-disable-next-line no-console
		console.error('[asset] NEXT_PUBLIC_ASSETS_BASE is empty in production!')
	}
}
