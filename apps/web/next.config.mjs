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
	swcMinify: true,
	productionBrowserSourceMaps: false,

	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'cdn.assets.stationeden.ru',
				port: '',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'stationeden.ru',
				port: '',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'www.stationeden.ru',
				port: '',
				pathname: '/**',
			},
			{
				protocol: 'http',
				hostname: 'localhost',
				port: '3000',
				pathname: '/**',
			},
			{
				protocol: 'http',
				hostname: '127.0.0.1',
				port: '3000',
				pathname: '/**',
			},
		],
		formats: ['image/webp', 'image/avif'],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
	},

	experimental: {
		serverActions: { bodySizeLimit: '2mb' },
		optimizePackageImports: [
			'socket.io-client',
			'react-hook-form',
			'@hookform/resolvers',
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

	// ✅ DEV: first-party прокси на API:4000
	async rewrites() {
		if (process.env.NODE_ENV !== 'production') {
			return [
				{
					source: '/auth/:path*',
					destination: 'http://localhost:4000/auth/:path*',
				},
				{
					source: '/api/:path*',
					destination: 'http://localhost:4000/api/:path*',
				},
				{
					source: '/users/:path*',
					destination: 'http://localhost:4000/users/:path*',
				},
			]
		}
		return []
	},

	async redirects() {
		const CDN = process.env.NEXT_PUBLIC_ASSETS_BASE || ''
		return collectPublicRedirects(CDN)
	},
}

export default nextConfig
