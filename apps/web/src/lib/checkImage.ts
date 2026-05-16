// apps/web/src/lib/checkImage.ts

export function checkImage(
	url: string,
	timeoutMs: number = 3000,
): Promise<boolean> {
	if (!url) return Promise.resolve(false)

	if (typeof window === 'undefined' || typeof Image === 'undefined') {
		return Promise.resolve(true)
	}

	return new Promise(resolve => {
		const image = new Image()
		let settled = false

		const finish = (ok: boolean) => {
			if (settled) return

			settled = true

			window.clearTimeout(timer)

			image.onload = null
			image.onerror = null
			image.src = ''

			resolve(ok)
		}

		const timer = window.setTimeout(() => {
			finish(false)
		}, timeoutMs)

		image.onload = () => {
			finish(true)
		}

		image.onerror = () => {
			finish(false)
		}

		image.src = url
	})
}
