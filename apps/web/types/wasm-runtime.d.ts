// apps/web/types/wasm-runtime.d.ts
// Описываем любые ресурсы под /wasm/* (файлы из public/wasm)
declare module '/wasm/*' {
	const mod: any
	export default mod
	export const init: any
	export const UsernameGenerator: any
	export const generate_username: any
}
