import type { KnipConfig } from 'knip'

const config: KnipConfig = {
	workspaces: {
		'.': {
			entry: ['scripts/**/*.ts', 'knip.config.ts'],
		},

		'apps/web': {
			entry: [
				'src/app/**/*.{ts,tsx}',
				'src/components/**/*.{ts,tsx}',
				'src/hooks/**/*.{ts,tsx}',
				'src/lib/**/*.{ts,tsx}',
				'src/utils/**/*.{ts,tsx}',
			],
			ignoreBinaries: ['wasm-pack'],
		},

		'apps/api': {
			entry: ['src/**/*.ts'],
			ignore: ['migrations/**/*', 'webpack.config.js'],
		},

		'packages/shared': {
			entry: ['src/**/*.ts'],
		},

		'packages/username-generator': {
			entry: ['*.rs', '**/*.rs'],
			ignoreBinaries: ['wasm-pack'],
		},
	},
}

export default config
