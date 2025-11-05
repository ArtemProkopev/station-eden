// apps/api/src/lobby/lobby.gateway.ts
import { Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import {
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	WebSocketGateway,
} from '@nestjs/websockets'
import * as cookie from 'cookie'
import type { IncomingMessage } from 'http'
import type { WebSocket } from 'ws'

type Player = {
	id: string
	name: string
	missions: number
	hours: number
	avatar?: string
	isReady: boolean
}

type LobbySettings = {
	maxPlayers: number
	gameMode: string
	isPrivate: boolean
	password: string
	difficulty?: string
	turnTime?: string
	fastGame?: boolean
	tournamentMode?: boolean
	limitedResources?: boolean
}

type ClientCtx = {
	userId: string
	lobbyId: string
}

type LobbyState = {
	settings: LobbySettings
	players: Map<string, Player>
}

@WebSocketGateway({
	path: '/lobby',
})
export class LobbyGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
	private readonly log = new Logger(LobbyGateway.name)

	constructor(private readonly jwt: JwtService) {}

	private rooms = new Map<string, Set<WebSocket>>()
	private clients = new WeakMap<WebSocket, ClientCtx>()
	private lobbies = new Map<string, LobbyState>()

	afterInit() {
		this.log.log('LobbyGateway initialized')
	}

	async handleConnection(client: WebSocket, req: IncomingMessage) {
		try {
			const url = new URL(req.url || '', `http://${req.headers.host}`)
			const lobbyId = url.searchParams.get('lobbyId') || 'default-lobby'

			const rawCookie = req.headers.cookie || ''
			const parsed = cookie.parse(rawCookie || '')
			const token = parsed['access_token']

			// В DEV допускаем отсутствие/невалидность JWT (чтобы локально не ронять соединение)
			const devMode = process.env.NODE_ENV !== 'production'
			let userId: string | undefined

			if (token) {
				try {
					const payload = await this.jwt.verifyAsync(token as string, {
						algorithms: ['HS256'],
						secret:
							process.env.JWT_ACCESS_SECRET ||
							process.env.JWT_SECRET ||
							'UNSET_SECRET',
					})
					userId = payload?.sub
				} catch (e: any) {
					this.log.warn(
						`WS auth verify failed (lobbyId=${lobbyId}): ${e?.message || e}`
					)
				}
			}

			if (!userId) {
				if (devMode) {
					userId = `dev-${Math.random().toString(36).slice(2, 10)}`
					this.log.warn(
						`WS auth: DEV fallback userId=${userId} (no/invalid token)`
					)
				} else {
					try {
						client.close(4001, 'Unauthorized')
					} catch {}
					return
				}
			}

			client.on('error', (err: any) => {
				this.log.error(
					`WS client error (user=${userId}, lobby=${lobbyId}): ${
						err?.message || err
					}`
				)
			})

			client.on('close', (code: number, reason: Buffer) => {
				const reasonStr = (() => {
					try {
						return reason?.toString?.() || ''
					} catch {
						return ''
					}
				})()
				this.log.warn(
					`WS closed (user=${userId}, lobby=${lobbyId}) code=${code} reason="${reasonStr}"`
				)
				this.handleDisconnect(client)
			})

			this.clients.set(client, { userId, lobbyId })
			if (!this.rooms.has(lobbyId)) this.rooms.set(lobbyId, new Set())
			this.rooms.get(lobbyId)!.add(client)

			if (!this.lobbies.has(lobbyId)) {
				this.lobbies.set(lobbyId, {
					settings: {
						maxPlayers: 4,
						gameMode: 'standard',
						isPrivate: false,
						password: '',
					},
					players: new Map(),
				})
			}

			const state = this.getLobbyState(lobbyId)
			this.safeSend(client, {
				type: 'LOBBY_STATE',
				players: Array.from(state.players.values()),
				settings: state.settings,
			})

			client.on('message', (buf: Buffer) => {
				try {
					const data = JSON.parse(buf.toString('utf-8'))
					this.routeMessage(client, data)
				} catch {
					this.safeSend(client, { type: 'ERROR', message: 'Bad JSON' })
				}
			})

			this.log.debug(`WS connected: user=${userId}, lobby=${lobbyId}`)
		} catch (e: any) {
			this.log.error(`handleConnection fatal: ${e?.message || e}`)
			try {
				client.close(1011, 'Internal error')
			} catch {}
		}
	}

	handleDisconnect(client: WebSocket) {
		const ctx = this.clients.get(client)
		if (!ctx) return
		const { lobbyId, userId } = ctx

		this.clients.delete(client)

		const set = this.rooms.get(lobbyId)
		if (set) {
			set.delete(client)
			if (set.size === 0) this.rooms.delete(lobbyId)
		}

		const lobby = this.lobbies.get(lobbyId)
		if (lobby && lobby.players.has(userId)) {
			lobby.players.delete(userId)
			this.broadcast(lobbyId, {
				type: 'PLAYER_LEFT',
				playerId: userId,
			})
		}
	}

	private getLobbyState(lobbyId: string): LobbyState {
		let lobby = this.lobbies.get(lobbyId)
		if (!lobby) {
			lobby = {
				settings: {
					maxPlayers: 4,
					gameMode: 'standard',
					isPrivate: false,
					password: '',
				},
				players: new Map(),
			}
			this.lobbies.set(lobbyId, lobby)
		}
		return lobby
	}

	private safeSend(client: WebSocket, payload: any) {
		try {
			if ((client as any).readyState === 1) {
				client.send(JSON.stringify(payload))
			}
		} catch (e: any) {
			this.log.warn(`safeSend error: ${e?.message || e}`)
		}
	}

	private broadcast(lobbyId: string, payload: any) {
		const set = this.rooms.get(lobbyId)
		if (!set) return
		const msg = JSON.stringify(payload)
		for (const c of set) {
			try {
				if ((c as any).readyState === 1) c.send(msg)
			} catch (e: any) {
				this.log.warn(`broadcast error: ${e?.message || e}`)
			}
		}
	}

	private routeMessage(client: WebSocket, data: any) {
		const ctx = this.clients.get(client)
		if (!ctx) return
		const { userId, lobbyId } = ctx
		const lobby = this.getLobbyState(lobbyId)

		switch (data.type) {
			case 'JOIN_LOBBY': {
				const p: Player = data.player
				lobby.players.set(p.id, p)
				this.broadcast(lobbyId, { type: 'PLAYER_JOINED', player: p })
				this.safeSend(client, {
					type: 'LOBBY_STATE',
					players: Array.from(lobby.players.values()),
					settings: lobby.settings,
				})
				break
			}

			case 'PLAYER_LEFT': {
				const pid: string = data.playerId ?? userId
				lobby.players.delete(pid)
				this.broadcast(lobbyId, { type: 'PLAYER_LEFT', playerId: pid })
				break
			}

			case 'SEND_MESSAGE': {
				const message = data.message
				this.broadcast(lobbyId, { type: 'CHAT_MESSAGE', message })
				this.safeSend(client, { type: 'MESSAGE_SENT', messageId: message.id })
				break
			}

			case 'TOGGLE_READY': {
				const pid: string = data.playerId ?? userId
				const player = lobby.players.get(pid)
				if (player) {
					player.isReady = !!data.isReady
					this.broadcast(lobbyId, {
						type: 'PLAYER_READY',
						playerId: pid,
						isReady: player.isReady,
					})
				}
				break
			}

			case 'UPDATE_LOBBY_SETTINGS': {
				lobby.settings = { ...lobby.settings, ...(data.settings || {}) }
				this.safeSend(client, {
					type: 'LOBBY_SETTINGS_UPDATE_SUCCESS',
					settings: lobby.settings,
				})
				this.broadcast(lobbyId, {
					type: 'LOBBY_SETTINGS_UPDATED',
					settings: lobby.settings,
				})
				break
			}

			default: {
				this.safeSend(client, {
					type: 'ERROR',
					message: `Unknown type: ${data.type}`,
				})
			}
		}
	}
}
