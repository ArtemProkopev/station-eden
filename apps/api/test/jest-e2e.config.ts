import type { Config } from 'jest'

const config: Config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: '..',

	testRegex: 'test/.*\\.e2e-spec\\.ts$',

	moduleFileExtensions: ['ts', 'js', 'json'],

	transform: {
		'^.+\\.ts$': 'ts-jest',
	},

	moduleNameMapper: {
		'^@station-eden/shared$': '<rootDir>/../../packages/shared/src/index.ts',
		'^@station-eden/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
	},

	setupFiles: ['<rootDir>/test/setup-env.ts'],
	setupFilesAfterEnv: ['<rootDir>/test/setup-jest.ts'],

	testTimeout: 30000,

	clearMocks: true,
	restoreMocks: true,
	verbose: true,

	coverageProvider: 'v8',
	coverageDirectory: './coverage',
	coverageReporters: ['text-summary', 'html', 'lcov'],

	collectCoverageFrom: [
		'src/auth/**/*.ts',
		'src/users/users.service.ts',
		'src/users/users.controller.ts',
		'src/common/cookies.ts',
		'src/common/guards/jwt-auth.guard.ts',
		'src/common/middleware/csrf.middleware.ts',
		'src/common/interceptors/response.interceptor.ts',
		'src/config/env.schema.ts',

		'!src/**/*.entity.ts',
		'!src/**/*.module.ts',
		'!src/**/*.dto.ts',
		'!src/**/index.ts',
		'!src/main.ts',
		'!src/db/**',
	],

	coveragePathIgnorePatterns: [
		'/node_modules/',
		'/test/',
		'/dist/',
		'\\.entity\\.ts$',
		'\\.module\\.ts$',
		'\\.dto\\.ts$',
	],
}

export default config
