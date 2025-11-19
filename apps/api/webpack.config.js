const webpack = require('webpack')

module.exports = function (options) {
	return {
		...options,
		// ВАЖНО: Включаем node_modules в бандл
		externals: [],
		plugins: [
			...options.plugins,
			// ВАЖНО: Запрещаем Webpack создавать чанки (файлы типа 2.main.js).
			// Всё будет в одном файле main.js. Это решает проблему "Cannot find module".
			new webpack.optimize.LimitChunkCountPlugin({
				maxChunks: 1,
			}),
		],
	}
}
