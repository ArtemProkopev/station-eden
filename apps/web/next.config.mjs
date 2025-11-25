// apps/web/next.config.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Собирает редиректы на CDN по содержимому папки /public:
 * - /<dir>/:path*  ->  <CDN>/web/<dir>/:path*
 * - /<file>        ->  <CDN>/web/<file>
 * Исключаем .well-known и wasm (wasm должен отдаваться с корректным MIME origin-сервером).
 */
function collectPublicRedirects(CDN) {
	const redirects = []
	if (!CDN) return redirects

	const publicDir = path.join(__dirname, 'public')
	if (!fs.existsSync(publicDir)) return redirects

	// Критично: убираем 'wasm' из редиректов, чтобы Next отдавал application/wasm
	const deny = new Set(['.well-known', 'wasm'])
	const entries = fs.readdirSync(publicDir, { withFileTypes: true })

	for (const e of entries) {
		const name = e.name
		if (deny.has(name)) continue
		if (e.isDirectory()) {
			redirects.push({
				source: `/${name}/:path*`,
				destination: `${CDN}/web/${name}/:path*`,
				permanent: false,
			})
		} else if (e.isFile()) {
			redirects.push({
				source: `/${name}`,
				destination: `${CDN}/web/${name}`,
				permanent: false,
			})
		}
	}
	return redirects
}

const nextConfig = {
	output: 'standalone',

	// Включаем сжатие ответа (gzip/brotli) на уровне Next
	compress: true,

	// Настройки для Next.js Image
	images: {
		// Разрешаем домены CDN
		domains: [
			'cdn.assets.stationeden.ru',
			// можно добавить другие домены если нужно
		],
		// Форматы изображений
		formats: ['image/webp', 'image/avif'],
		// Размеры для респонсив images
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		// Отключаем встроенную оптимизацию для внешних изображений (они уже оптимизированы на CDN)
		// Но оставляем для локальных изображений
		// unoptimized: process.env.NODE_ENV === 'production' // опционально
	},

	experimental: {
		serverActions: { bodySizeLimit: '2mb' },

		// Оптимизация импортов популярных пакетов
		optimizePackageImports: [
			'react',
			'react-dom',
			'socket.io-client',
			'react-hook-form',
			'@hookform/resolvers',
		],
	},

	async redirects() {
		const CDN = process.env.NEXT_PUBLIC_ASSETS_BASE || ''
		return collectPublicRedirects(CDN)
	},
}

export default nextConfig