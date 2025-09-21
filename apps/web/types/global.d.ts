// Типы для CSS-модулей (только для web-пакета)
declare module '*.module.css' {
	const classes: { [key: string]: string }
	export default classes
}
// (на всякий случай) обычные .css
declare module '*.css' {
	const classes: { [key: string]: string }
	export default classes
}
