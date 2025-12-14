// apps/api/webpack.config.js
const webpack = require('webpack')

module.exports = function (options) {
	const isProd = process.env.NODE_ENV === 'production'

	return {
		...options,
		mode: isProd ? 'production' : 'development',
		devtool: isProd ? false : options.devtool,

		// не затирай externals
		externals: options.externals,

		optimization: {
			...(options.optimization || {}),
			minimize: isProd,
		},
		plugins: [
			...(options.plugins || []),
			new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
		],
	}
}
