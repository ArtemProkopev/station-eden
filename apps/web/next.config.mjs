import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'

// Используем require для подключения process
const require = createRequire(import.meta.url)
const process = require('process')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// monorepo root = на уровень выше apps/
const repoRoot = path.resolve(__dirname, '../..')

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

// На Windows отключаем standalone, чтобы не упираться в symlink EPERM.
// На Linux/CI оставляем standalone как было.
const isWindows = process.platform === 'win32'

/** @type {import('next').NextConfig} */
const nextConfig = {
	output: isWindows ? undefined : 'standalone',
	compress: true,
	poweredByHeader: false,
	productionBrowserSourceMaps: false,

	// убирает warning про неправильный workspace root / lockfile
	outputFileTracingRoot: repoRoot,

	images: {
		domains: ['cdn.assets.stationeden.ru'],
		formats: ['image/webp', 'image/avif'],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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

		// Добавляем поддержку process для ES модулей
		config.resolve.fallback = {
			...config.resolve.fallback,
			process: require.resolve('process/browser'),
			stream: require.resolve('stream-browserify'),
			url: require.resolve('url'),
			buffer: require.resolve('buffer'),
			assert: require.resolve('assert'),
			crypto: require.resolve('crypto-browserify'),
			events: require.resolve('events'),
			os: require.resolve('os-browserify/browser'),
			path: require.resolve('path-browserify'),
			util: require.resolve('util/'),
		}

		return config
	},

	// В DEV: /api/* -> http://localhost:4000/*
	// В PROD: не нужен, потому что у тебя Caddy делает handle_path /api/*
	async rewrites() {
		const isDev = process.env.NODE_ENV !== 'production'
		if (!isDev) return []

		return [
			{
				source: '/api/:path*',
				destination: 'http://localhost:4000/:path*',
			},
		]
	},

	async redirects() {
		const CDN = process.env.NEXT_PUBLIC_ASSETS_BASE || ''
		return collectPublicRedirects(CDN)
	},
}

export default nextConfig
