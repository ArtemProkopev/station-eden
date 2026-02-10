// apps/web/src/lib/flags.ts

function toBool(raw: string | undefined | null): boolean | undefined {
	if (raw == null) return undefined
	const v = raw.trim().toLowerCase()
	if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true
	if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false
	return undefined
}

function normalizeBaseUrl(raw: string | undefined): string {
	// В браузере ВСЕГДА используем /api (Caddy prod + Next rewrites dev)
	if (typeof window !== 'undefined') return '/api'

	// На сервере (SSR / middleware / node) — env или fallback на localhost
	const v = (raw || '').trim()
	if (!v) return 'http://localhost:4000'
	return v.replace(/\/+$/, '')
}

export const API_BASE = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE)

// Важно: в prod дефолт FALSE, чтобы случайно не светить OAuth-кнопки
export const GOOGLE_ENABLED =
	toBool(process.env.NEXT_PUBLIC_ENABLE_GOOGLE) ?? false

export const YANDEX_ENABLED =
	toBool(process.env.NEXT_PUBLIC_ENABLE_YANDEX) ?? false
