// apps/web/next.config.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function collectPublicRedirects(CDN) {
	const redirects = []
	if (!CDN) return redirects

	const publicDir = path.join(__dirname, 'public')
	if (!fs.existsSync(publicDir)) return redirects

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

/** @type {import('next').NextConfig} */
const nextConfig = {
	output: 'standalone',
	compress: true,
	poweredByHeader: false,
	productionBrowserSourceMaps: false,

	images: {
		domains: ['cdn.assets.stationeden.ru'],
		formats: ['image/webp', 'image/avif'],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

		// чтобы quality=85 не ругался (и Next16 не сломал сборку)
		qualities: [60, 70, 75, 80, 85, 90, 95, 100],
	},

	experimental: {
		serverActions: { bodySizeLimit: '2mb' },
		optimizePackageImports: [
			'socket.io-client',
			'react-hook-form',
			'@hookform/resolvers',
			'framer-motion',
			'gsap',
			'@livekit/components-react',
		],
	},

	webpack(config, { dev, isServer }) {
		if (!dev && !isServer) {
			config.devtool = false
		}
		return config
	},

	async redirects() {
		const CDN = process.env.NEXT_PUBLIC_ASSETS_BASE || ''
		return collectPublicRedirects(CDN)
	},
}

export default nextConfig
