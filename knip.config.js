/** @type {import('knip').KnipConfig} */
export default {
	workspaces: {
		'apps/api': {
			// У Nest есть точки входа:
			// 1) HTTP/WebSocket приложение
			// 2) TypeORM CLI data-source (миграции, генерация, run/revert)
			entry: ['src/main.ts', 'src/app.module.ts', 'src/db/data-source.ts'],
			project: ['src/**/*.ts'],
			ignore: [
				'migrations/**', // TypeORM берёт по glob
				'dist/**',
				'node_modules/**',
			],
		},

		'apps/web': {
			// Next.js App Router/route handlers — entrypoints фреймворка
			// middleware.ts knip обычно сам подхватывает, поэтому убираем из entry
			entry: [
				'src/app/**/page.tsx',
				'src/app/**/layout.tsx',
				'src/app/**/route.ts',
			],
			project: ['src/**/*.{ts,tsx}'],
			ignore: [
				'.next/**',
				'dist/**',
				'node_modules/**',
				'public/**',
				'next-env.d.ts',

				// если это реальные ложные срабатывания — ок оставлять
				'src/app/game/hooks/useGame.ts',
				'src/hooks/useGameSocket.ts',
				'src/app/game/types/game.types.ts',
			],
		},

		'packages/shared': {
			// entry убираем — knip возьмёт через package.json exports/main + project
			project: ['src/**/*.ts'],
			ignore: ['dist/**', 'node_modules/**'],
		},

		'packages/username-generator': {
			ignore: ['**'],
		},
	},

	ignore: [
		'**/node_modules/**',
		'**/dist/**',
		'**/.next/**',
		'apps/api/migrations/**',
		'packages/username-generator/target/**',
		'scripts/**',
	],

	// чтобы убрать "Unlisted binaries: wasm-pack"
	ignoreBinaries: ['wasm-pack'],

	ignoreDependencies: ['ts-loader'],
}
