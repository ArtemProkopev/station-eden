// apps/web/src/lib/asset.ts

// Единая нормализация публичных ссылок на ассеты.
// Основной красивый домен для ассетов.
export const PRIMARY = (process.env.NEXT_PUBLIC_ASSETS_BASE || '').replace(
  /\/+$/,
  '',
)

// ВАЖНО: домен бакета Selectel, fallback без CDN-оптимизации.
export const FALLBACK = (
  process.env.NEXT_PUBLIC_ASSETS_FALLBACK ||
  'https://station-eden-media.s3.ru-1.storage.selcloud.ru'
).replace(/\/+$/, '')

const IMAGE_RE = /\.(jpe?g|png|gif|webp)(?:[?#].*)?$/i
const JPEG_RE = /\.(jpe?g)(?:[?#].*)?$/i

export type AssetOptions = {
  quality?: number
  resize?: string | number
  progressive?: boolean
  raw?: boolean
}

function normalizeRel(rel: string): string {
  if (!rel) return rel
  return rel.startsWith('/') ? rel : `/${rel}`
}

function clampQuality(value: number): number {
  if (!Number.isFinite(value)) return 80
  return Math.max(1, Math.min(100, Math.round(value)))
}

/**
 * Абсолютный URL без Selectel ioss-параметров.
 * Используется для fallback на S3 и для не-картинок: svg, ico, fonts, wasm и т.д.
 */
export function rawAsset(rel: string, base = PRIMARY || FALLBACK): string {
  if (!rel) return rel as unknown as string
  if (/^https?:\/\//i.test(rel)) return rel

  const path = normalizeRel(rel)
  return `${base}/web${path}`
}

/**
 * Абсолютный CDN URL по ключу/относительному пути.
 *
 * Для JPEG/PNG/GIF/WebP добавляет Selectel ioss-параметры:
 * https://cdn.assets.stationeden.ru/ioss(quality=80)/web/image.webp
 *
 * Для SVG/ICO/шрифтов/etc возвращает обычный URL без ioss.
 */
export function asset(rel: string, options: AssetOptions = {}): string {
  if (!rel) return rel as unknown as string
  if (/^https?:\/\//i.test(rel)) return rel

  const path = normalizeRel(rel)
  const base = PRIMARY || FALLBACK

  const shouldUseIoss =
    !options.raw && Boolean(PRIMARY) && base !== FALLBACK && IMAGE_RE.test(path)

  if (!shouldUseIoss) {
    return rawAsset(path, base)
  }

  const params: string[] = []

  const defaultQuality = Number(process.env.NEXT_PUBLIC_CDN_IMAGE_QUALITY || 80)
  params.push(`quality=${clampQuality(options.quality ?? defaultQuality)}`)

  if (options.resize) {
    params.push(`resize=${String(options.resize)}`)
  }

  if (options.progressive && JPEG_RE.test(path)) {
    params.push('progressive=y')
  }

  return `${base}/ioss(${params.join(',')})/web${path}`
}