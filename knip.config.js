/** @type {import('knip').KnipConfig} */
export default {
	workspaces: {
		'apps/api': {
			// У Nest есть две реальных точки входа:
			// 1) HTTP/WebSocket приложение
			// 2) TypeORM CLI data-source (миграции, генерация, run/revert)
			entry: ['src/main.ts', 'src/app.module.ts', 'src/db/data-source.ts'],
			project: ['src/**/*.ts'],
			ignore: [
				// Миграции подхватываются TypeORM по glob, не через импорты
				'migrations/**',

				// Сборочные артефакты
				'dist/**',
				'node_modules/**',
			],
		},

		'apps/web': {
			// Next.js App Router/route handlers + middleware — это entrypoints фреймворка
			entry: [
				'src/app/**/page.tsx',
				'src/app/**/layout.tsx',
				'src/app/**/route.ts',
				'middleware.ts',
			],
			project: ['src/**/*.{ts,tsx}'],
			ignore: [
				'.next/**',
				'dist/**',
				'node_modules/**',
				'public/**',
				'next-env.d.ts',

				// Если тут были ложные срабатывания — лучше решать точечно.
				// (Пока оставим твои исключения, но можно будет пересмотреть после следующего прогона)
				'src/app/game/hooks/useGame.ts',
				'src/hooks/useGameSocket.ts',
				'src/app/game/types/game.types.ts',
			],
		},

		'packages/shared': {
			entry: ['src/index.ts'],
			project: ['src/**/*.ts'],
			ignore: ['dist/**', 'node_modules/**'],
		},

		// Rust/wasm package: статанализ JS/TS тут пока не нужен
		'packages/username-generator': {
			ignore: ['**'],
		},
	},

	// Глобальные игноры (на всякий случай, чтобы не ловить мусор)
	ignore: [
		'**/node_modules/**',
		'**/dist/**',
		'**/.next/**',
		'apps/api/migrations/**',
		'packages/username-generator/target/**',

		// Корневые scripts отдельно (у тебя там sync-media.ts и он имеет свои deps)
		// Если захочешь анализировать scripts — лучше вынести в отдельный workspace-пакет.
		'scripts/**',
	],

	// Важно: ts-loader используется через webpack.config.js, не через import.
	// Knip не увидит его как "used", поэтому исключаем из предупреждений.
	ignoreDependencies: ['ts-loader'],
}
