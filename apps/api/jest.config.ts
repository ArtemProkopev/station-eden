import type { Config } from 'jest'

const config: Config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: '.',
	testRegex: '.*\\.spec\\.ts$',
	moduleFileExtensions: ['ts', 'js', 'json'],
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
	moduleNameMapper: {
		'^@station-eden/shared$': '<rootDir>/../../packages/shared/src/index.ts',
		'^@station-eden/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
	},
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.entity.ts',
		'!src/**/*.module.ts',
		'!src/main.ts',
		'!src/db/**',
		'!src/**/*.spec.ts',
	],
	coverageDirectory: './coverage',
}

export default config
