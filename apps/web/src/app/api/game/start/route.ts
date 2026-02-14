// apps/web/src/app/api/game/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

type PlayerInput = {
	id: string
	name: string
	avatar?: string
}

type GameSettings = {
	gameMode?: string
	maxRounds?: number
}

type GameState = {
	id: string
	lobbyId: string
	status: 'active'
	players: Array<{
		id: string
		name: string
		avatar?: string
		score: number
		isActive: boolean
		order: number
	}>
	currentPlayerId: string
	round: number
	startedAt: string
	settings: Required<GameSettings>
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v)
}

function isPlayerInput(v: unknown): v is PlayerInput {
	if (!isRecord(v)) return false
	return typeof v.id === 'string' && typeof v.name === 'string'
}

const games = new Map<string, GameState>()

export async function POST(request: NextRequest) {
	try {
		const bodyUnknown = (await request.json().catch(() => null)) as unknown
		if (!isRecord(bodyUnknown)) {
			return NextResponse.json(
				{ error: 'Некорректный запрос' },
				{ status: 400 },
			)
		}

		const lobbyId =
			typeof bodyUnknown.lobbyId === 'string' ? bodyUnknown.lobbyId : ''
		const playersRaw = bodyUnknown.players
		const _creatorId = bodyUnknown.creatorId
		const settingsRaw = bodyUnknown.settings

		const players = Array.isArray(playersRaw)
			? playersRaw.filter(isPlayerInput)
			: []

		if (!lobbyId || players.length < 2) {
			return NextResponse.json(
				{ error: 'Недостаточно игроков для начала игры' },
				{ status: 400 },
			)
		}

		const gameId = uuidv4().substring(0, 8)

		const settings: Required<GameSettings> = {
			gameMode:
				isRecord(settingsRaw) && typeof settingsRaw.gameMode === 'string'
					? settingsRaw.gameMode
					: 'standard',
			maxRounds:
				isRecord(settingsRaw) && typeof settingsRaw.maxRounds === 'number'
					? settingsRaw.maxRounds
					: 10,
		}

		const gameState: GameState = {
			id: gameId,
			lobbyId,
			status: 'active',
			players: players.map((player, index) => ({
				id: player.id,
				name: player.name,
				avatar: typeof player.avatar === 'string' ? player.avatar : undefined,
				score: 0,
				isActive: true,
				order: index + 1,
			})),
			currentPlayerId: players[0].id,
			round: 1,
			startedAt: new Date().toISOString(),
			settings,
		}

		games.set(gameId, gameState)

		return NextResponse.json({
			success: true,
			gameId,
			redirectUrl: `/game/${gameId}`,
			gameState,
		})
	} catch (error) {
		console.error('Error starting game:', error)
		return NextResponse.json(
			{ error: 'Ошибка при создании игры' },
			{ status: 500 },
		)
	}
}

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const gameId = searchParams.get('gameId')

	if (!gameId) {
		return NextResponse.json({ error: 'ID игры не указан' }, { status: 400 })
	}

	const gameState = games.get(gameId)

	if (!gameState) {
		return NextResponse.json({ error: 'Игра не найдена' }, { status: 404 })
	}

	return NextResponse.json({ success: true, gameState })
}
