import { Socket } from 'socket.io-client'

export function waitForSocketEvent<T = unknown>(
	socket: Socket,
	eventName: string,
	timeoutMs = 5000,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			cleanup()
			reject(new Error(`Socket event "${eventName}" was not received`))
		}, timeoutMs)

		function cleanup() {
			clearTimeout(timer)
			socket.off(eventName, onEvent)
			socket.off('connect_error', onConnectError)
		}

		function onEvent(payload: T) {
			cleanup()
			resolve(payload)
		}

		function onConnectError(error: Error) {
			cleanup()
			reject(error)
		}

		socket.once(eventName, onEvent)
		socket.once('connect_error', onConnectError)
	})
}

export async function disconnectSocket(socket?: Socket) {
	if (!socket) return

	if (!socket.connected) {
		socket.disconnect()
		return
	}

	await new Promise<void>(resolve => {
		socket.once('disconnect', () => resolve())
		socket.disconnect()
		setTimeout(resolve, 300)
	})
}
