/** @type {import('next').NextConfig} */
const nextConfig = {
	output: 'standalone',
	experimental: { serverActions: { bodySizeLimit: '2mb' } },
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: 'cdn.assets.stationeden.ru' },
			{ protocol: 'https', hostname: '*.selstorage.ru' }, // временно, пока чистите данные/старые ссылки
			{ protocol: 'https', hostname: 'stationeden.ru' }, // если где-то попадается origin
		],
	},
}
export default nextConfig
