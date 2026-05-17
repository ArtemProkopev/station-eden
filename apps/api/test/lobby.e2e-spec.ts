import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { io, Socket } from 'socket.io-client'
import { Repository } from 'typeorm'

import { AppModule } from '../src/app.module'
import { EmailCode } from '../src/auth/email-code.entity'
import { User } from '../src/users/user.entity'
import { registerAndAuthorizeUser } from './helpers/auth'
import { cleanupE2EUsers } from './helpers/cleanup'
import { disconnectSocket, waitForSocketEvent } from './helpers/socket'
import { setupTestApp } from './setup-test-app'

type LobbyPlayer = {
	id: string
	name: string
	missions: number
	hours: number
	avatar?: string
	isReady: boolean
}

type LobbyStatePayload = {
	players: LobbyPlayer[]
	settings: {
		maxPlayers: number
		gameMode: string
		isPrivate: boolean
		password: string
	}
	creatorId: string
	gameStarted: boolean
}

describe('WebSocket-лобби', () => {
	let app: INestApplication
	let serverUrl: string
	let emailCodesRepo: Repository<EmailCode>
	let usersRepo: Repository<User>
	let socket: Socket | undefined

	const createdEmails: string[] = []

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()

		app = moduleRef.createNestApplication()
		setupTestApp(app)

		await app.listen(0)

		const address = app.getHttpServer().address()

		if (typeof address === 'string' || !address) {
			throw new Error('Test server address was not resolved')
		}

		serverUrl = `http://127.0.0.1:${address.port}`

		emailCodesRepo = moduleRef.get<Repository<EmailCode>>(
			getRepositoryToken(EmailCode),
		)

		usersRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User))
	})

	afterEach(async () => {
		await disconnectSocket(socket)
		socket = undefined
	})

	afterAll(async () => {
		await cleanupE2EUsers({
			emails: createdEmails,
			emailCodesRepo,
			usersRepo,
		})

		await app.close()
	})

	it('отклоняет подключение без JWT-cookie', async () => {
		const lobbyId = `ws-noauth-${Date.now()}`

		socket = io(serverUrl, {
			path: '/lobby',
			transports: ['websocket'],
			query: {
				lobbyId,
			},
			reconnection: false,
			forceNew: true,
		})

		const errorPayload = await waitForSocketEvent<{ message: string }>(
			socket,
			'ERROR',
		)

		expect(errorPayload.message).toContain('Authentication required')
	})

	it('подключает авторизованного пользователя к лобби и меняет статус готовности', async () => {
		const user = await registerAndAuthorizeUser(app, emailCodesRepo)
		createdEmails.push(user.email)

		const lobbyId = `ws-lobby-${Date.now()}`

		socket = io(serverUrl, {
			path: '/lobby',
			transports: ['websocket'],
			query: {
				lobbyId,
			},
			extraHeaders: {
				Cookie: user.authCookieHeader,
			},
			reconnection: false,
			forceNew: true,
		})

		const initialState = await waitForSocketEvent<LobbyStatePayload>(
			socket,
			'LOBBY_STATE',
		)

		expect(initialState.players).toHaveLength(0)
		expect(initialState.gameStarted).toBe(false)
		expect(initialState.settings).toBeDefined()
		expect(initialState.creatorId).toBeDefined()

		socket.emit('JOIN_LOBBY', {
			player: {
				name: user.username,
				missions: 0,
				hours: 0,
				isReady: false,
			},
		})

		const joinedState = await waitForSocketEvent<LobbyStatePayload>(
			socket,
			'LOBBY_STATE',
		)

		expect(joinedState.players).toHaveLength(1)
		expect(joinedState.players[0].name).toBe(user.username)
		expect(joinedState.players[0].isReady).toBe(false)

		socket.emit('TOGGLE_READY', {
			isReady: true,
		})

		const readyState = await waitForSocketEvent<LobbyStatePayload>(
			socket,
			'LOBBY_STATE',
		)

		expect(readyState.players).toHaveLength(1)
		expect(readyState.players[0].name).toBe(user.username)
		expect(readyState.players[0].isReady).toBe(true)
	})
})
