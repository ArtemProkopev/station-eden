const ignoredConsoleMessages = [
	'[config] loaded env files',
	'[DEV][EmailService]',
]

const originalConsoleLog = console.log.bind(console)
const originalConsoleWarn = console.warn.bind(console)

function shouldIgnoreConsoleMessage(message?: unknown) {
	return (
		typeof message === 'string' &&
		ignoredConsoleMessages.some(ignored => message.includes(ignored))
	)
}

beforeEach(() => {
	jest
		.spyOn(console, 'log')
		.mockImplementation((message?: unknown, ...args) => {
			if (shouldIgnoreConsoleMessage(message)) {
				return
			}

			originalConsoleLog(message, ...args)
		})

	jest
		.spyOn(console, 'warn')
		.mockImplementation((message?: unknown, ...args) => {
			if (shouldIgnoreConsoleMessage(message)) {
				return
			}

			originalConsoleWarn(message, ...args)
		})
})

afterEach(() => {
	jest.restoreAllMocks()
})
  