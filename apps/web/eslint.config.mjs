// apps/web/eslint.config.mjs
import js from '@eslint/js'
import eslintPluginTypescript from '@typescript-eslint/eslint-plugin'
import eslintPluginReact from 'eslint-plugin-react'

const config = [
	// Игноры
	{
		ignores: [
			'**/node_modules/**',
			'**/.next/**',
			'**/dist/**',
			'**/public/wasm/**',
			'**/*.d.ts',
		],
	},

	// Подключаем плагин JS (рекомендованные правила)
	js.configs.recommended,

	// Подключаем плагин для React и его рекомендации
	{
		plugins: {
			react: eslintPluginReact,
		},
		rules: {
			'react/jsx-uses-react': 'off', // Для React 17+
			'react/react-in-jsx-scope': 'off', // Для React 17+
		},
	},

	// Подключаем плагин для TypeScript и его рекомендации
	{
		plugins: {
			'@typescript-eslint': eslintPluginTypescript,
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
		},
	},

	// Применяем правила из плагинов вручную (аналогичные `extends`)
	{
		rules: {
			// Добавляем рекомендации из плагинов
			'react/prop-types': 'off', // Пример настройки для React
			'@typescript-eslint/no-unused-vars': 'warn', // Пример для TypeScript
		},
	},

	// Устанавливаем глобальные переменные для Node.js
	{
		languageOptions: {
			globals: {
				process: 'readonly',
				require: 'readonly',
			},
		},
	},
]

export default config
