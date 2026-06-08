// apps/web/src/app/lobby/hooks/useLobby.ts
import { useProfile } from '@/app/profile/hooks/useProfile'
import { useLobbySocket } from '@/hooks/useLobbySocket'
import { useScrollPrevention } from '@/hooks/useScrollPrevention'
import { WebSocketMessage } from '@/hooks/useWebSocket'
import {
	ChatMessage,
	LobbySettings,
	LobbyPlayer as Player,
} from '@station-eden/shared'
import { useRouter } from 'next/navigation'
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type FormEvent,
	type KeyboardEvent,
} from 'react'
import { AddPlayerModal } from '../components/AddPlayerModal/AddPlayerModal'
import { LobbySettingsModal } from '../components/LobbySettingsModal/LobbySettingsModal'
import { PlayerManagementModal } from '../components/PlayerManagementModal/PlayerManagementModal'

const DEFAULT_LOBBY_SETTINGS: LobbySettings = {
	maxPlayers: 4,
	gameMode: 'standard',
	isPrivate: false,
	visibility: 'public',
	hasPassword: false,
	password: '',
	difficulty: 'normal',
	turnTime: 180,
	maxRounds: 10,
	discussionTime: 180,
	votingTime: 60,
	hiddenRolesCount: 0,
	enableCrises: true,
	searchingPlayers: false,
}

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
	{
		id: '1',
		playerId: 'system',
		playerName: 'Система',
		text: 'Добро пожаловать в лобби!',
		timestamp: new Date(Date.now() - 300000),
		type: 'system',
	},
]

function isRecord(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v)
}

function normalizeChatType(v: unknown): 'system' | 'player' | undefined {
	return v === 'system' || v === 'player' ? v : undefined
}

function pickNumber(v: unknown): number {
	return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function safeDate(v: unknown): Date {
	if (v instanceof Date) return v

	if (typeof v === 'string') {
		const d = new Date(v)
		return Number.isNaN(d.getTime()) ? new Date() : d
	}

	return new Date()
}

function toIsoTimestamp(ts: string | Date): string {
	if (ts instanceof Date) return ts.toISOString()

	const d = new Date(ts)
	return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function toLobbyPlayer(v: unknown): Player | null {
	if (!isRecord(v)) return null

	const id = typeof v.id === 'string' ? v.id : null
	const name = typeof v.name === 'string' ? v.name : null

	if (!id || !name) return null

	return {
		id,
		name,
		missions: pickNumber(v.missions),
		hours: pickNumber(v.hours),
		isReady: typeof v.isReady === 'boolean' ? v.isReady : false,
		avatar: typeof v.avatar === 'string' ? v.avatar : undefined,
	}
}

function normalizeSettings(v: unknown): LobbySettings {
	if (!isRecord(v)) return DEFAULT_LOBBY_SETTINGS

	const maxPlayers =
		typeof v.maxPlayers === 'number' && Number.isFinite(v.maxPlayers)
			? Math.max(2, Math.min(6, Math.trunc(v.maxPlayers)))
			: DEFAULT_LOBBY_SETTINGS.maxPlayers

	const hiddenRolesCount =
		typeof v.hiddenRolesCount === 'number' &&
		Number.isFinite(v.hiddenRolesCount)
			? Math.max(0, Math.min(Math.trunc(v.hiddenRolesCount), 1))
			: 0

	const difficulty =
		v.difficulty === 'easy' ||
		v.difficulty === 'normal' ||
		v.difficulty === 'hard'
			? v.difficulty
			: 'normal'

	const turnTime =
		typeof v.turnTime === 'number' && Number.isFinite(v.turnTime)
			? Math.trunc(v.turnTime)
			: 180

	const maxRounds =
		typeof v.maxRounds === 'number' && Number.isFinite(v.maxRounds)
			? Math.max(3, Math.min(20, Math.trunc(v.maxRounds)))
			: 10

	const discussionTime =
		typeof v.discussionTime === 'number' && Number.isFinite(v.discussionTime)
			? Math.max(30, Math.min(600, Math.trunc(v.discussionTime)))
			: 180

	const votingTime =
		typeof v.votingTime === 'number' && Number.isFinite(v.votingTime)
			? Math.max(15, Math.min(300, Math.trunc(v.votingTime)))
			: 60

	const visibility =
		v.visibility === 'public' ||
		v.visibility === 'password' ||
		v.visibility === 'hidden_password'
			? v.visibility
			: 'public'

	const searchingPlayers =
		visibility === 'hidden_password'
			? false
			: typeof v.searchingPlayers === 'boolean'
				? v.searchingPlayers
				: false

	return {
		maxPlayers,
		gameMode:
			v.gameMode === 'standard' ||
			v.gameMode === 'extended' ||
			v.gameMode === 'competitive' ||
			v.gameMode === 'cooperative'
				? v.gameMode
				: 'standard',
		isPrivate: visibility === 'hidden_password',
		visibility,
		hasPassword: typeof v.hasPassword === 'boolean' ? v.hasPassword : false,
		password: '',
		difficulty,
		turnTime,
		maxRounds,
		discussionTime,
		votingTime,
		hiddenRolesCount,
		enableCrises: typeof v.enableCrises === 'boolean' ? v.enableCrises : true,
		searchingPlayers,
	}
}

function makeId(prefix: string) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getStoredLobbyPassword(lobbyId: string): string | undefined {
	if (typeof window === 'undefined') return undefined

	const value = window.sessionStorage.getItem(
		`station-eden:lobby-password:${lobbyId}`,
	)

	return value || undefined
}

function saveStoredLobbyPassword(lobbyId: string, password: string) {
	if (typeof window === 'undefined') return

	window.sessionStorage.setItem(
		`station-eden:lobby-password:${lobbyId}`,
		password,
	)
}

function removeStoredLobbyPassword(lobbyId: string) {
	if (typeof window === 'undefined') return

	window.sessionStorage.removeItem(`station-eden:lobby-password:${lobbyId}`)
}

function isLobbyPasswordError(message: string) {
	const normalized = message.toLowerCase()

	return (
		normalized.includes('пароль') ||
		normalized.includes('password') ||
		normalized.includes('lobby_locked')
	)
}

export function useLobby(lobbyIdFromProps?: string) {
	const router = useRouter()
	const {
		profile,
		assets,
		loadSavedAssets,
		loadUserData,
		checkIconsAvailability,
	} = useProfile()

	const [players, setPlayers] = useState<Player[]>([])
	const [showAddPlayerModal, setShowAddPlayerModal] = useState(false)
	const [showLobbySettingsModal, setShowLobbySettingsModal] = useState(false)
	const [lobbySettings, setLobbySettings] = useState<LobbySettings>(
		DEFAULT_LOBBY_SETTINGS,
	)
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
		INITIAL_CHAT_MESSAGES,
	)
	const [newMessage, setNewMessage] = useState('')
	const [isLoading, setIsLoading] = useState(true)
	const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
	const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false)
	const [lobbyCreatorId, setLobbyCreatorId] = useState<string>('')
	const [error, setError] = useState<string>('')

	const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false)
	const [passwordPromptError, setPasswordPromptError] = useState('')
	const [isSubmittingLobbyPassword, setIsSubmittingLobbyPassword] =
		useState(false)

	const chatContainerRef = useRef<HTMLDivElement>(null)
	const shouldScrollRef = useRef(true)
	const seenMsgIdsRef = useRef<Set<string>>(new Set())
	const playersRef = useRef<Player[]>([])
	const lobbySettingsRef = useRef<LobbySettings>(DEFAULT_LOBBY_SETTINGS)
	const lobbyIdRef = useRef<string>(lobbyIdFromProps || 'default-lobby')
	const hasJoinedRef = useRef(false)
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const currentUserId = profile.data?.id

	useEffect(() => {
		playersRef.current = players
	}, [players])

	useEffect(() => {
		lobbySettingsRef.current = lobbySettings
	}, [lobbySettings])

	useEffect(() => {
		lobbyIdRef.current = lobbyIdFromProps || 'default-lobby'
		hasJoinedRef.current = false
	}, [lobbyIdFromProps])

	useScrollPrevention()

	const handleWebSocketMessage = useCallback(
		(data: WebSocketMessage) => {
			if (!data?.type) return

			switch (data.type) {
				case 'PLAYER_JOINED': {
					const candidate = (data as Record<string, unknown>).player
					const player = toLobbyPlayer(candidate)

					if (!player) break

					setPlayers(prev => {
						const exists = prev.some(p => p.id === player.id)
						if (exists) return prev
						if (prev.length >= lobbySettingsRef.current.maxPlayers) return prev
						return [...prev, player]
					})

					break
				}

				case 'PLAYER_LEFT': {
					const playerId =
						typeof (data as Record<string, unknown>).playerId === 'string'
							? ((data as Record<string, unknown>).playerId as string)
							: ''

					if (playerId) {
						setPlayers(prev => prev.filter(p => p.id !== playerId))
					}

					break
				}

				case 'CHAT_MESSAGE': {
					const msgAny = (data as Record<string, unknown>).message
					const msg = isRecord(msgAny) ? msgAny : {}

					const id = typeof msg.id === 'string' ? msg.id : makeId('srv')
					if (seenMsgIdsRef.current.has(id)) break

					seenMsgIdsRef.current.add(id)

					const nextMessage: ChatMessage = {
						id,
						playerId:
							typeof msg.playerId === 'string' ? msg.playerId : 'unknown',
						playerName:
							typeof msg.playerName === 'string' ? msg.playerName : 'Игрок',
						text: String(msg.text ?? '').slice(0, 300),
						timestamp: safeDate(msg.timestamp),
						type: normalizeChatType(msg.type) ?? 'player',
					}

					setChatMessages(prev => [...prev, nextMessage])
					shouldScrollRef.current = true
					break
				}

				case 'LOBBY_STATE': {
					const list = (data as Record<string, unknown>).players
					const normalizedPlayers = Array.isArray(list)
						? (list.map(toLobbyPlayer).filter(Boolean) as Player[])
						: []

					setPlayers(normalizedPlayers)

					const settings = (data as Record<string, unknown>).settings
					setLobbySettings(normalizeSettings(settings))

					const creatorId =
						typeof (data as Record<string, unknown>).creatorId === 'string'
							? ((data as Record<string, unknown>).creatorId as string)
							: ''

					if (creatorId) setLobbyCreatorId(creatorId)

					const hasCurrentUser = currentUserId
						? normalizedPlayers.some(player => player.id === currentUserId)
						: false

					if (hasCurrentUser) {
						hasJoinedRef.current = true
						setIsPasswordPromptOpen(false)
						setPasswordPromptError('')
						setIsSubmittingLobbyPassword(false)
						setError('')
					}

					break
				}

				case 'LOBBY_LOCKED': {
					const message =
						typeof (data as Record<string, unknown>).message === 'string'
							? ((data as Record<string, unknown>).message as string)
							: 'Для подключения к лобби нужен пароль'

					hasJoinedRef.current = false
					setPasswordPromptError(message)
					setIsPasswordPromptOpen(true)
					setIsSubmittingLobbyPassword(false)
					setError('')
					break
				}

				case 'PLAYER_READY': {
					const playerId =
						typeof (data as Record<string, unknown>).playerId === 'string'
							? ((data as Record<string, unknown>).playerId as string)
							: ''
					const isReady =
						typeof (data as Record<string, unknown>).isReady === 'boolean'
							? ((data as Record<string, unknown>).isReady as boolean)
							: false

					if (!playerId) break

					setPlayers(prev =>
						prev.map(p => (p.id === playerId ? { ...p, isReady } : p)),
					)

					break
				}

				case 'LOBBY_SETTINGS_UPDATED': {
					const settings = (data as Record<string, unknown>).settings
					setLobbySettings(normalizeSettings(settings))
					break
				}

				case 'GAME_STARTED': {
					const redirectUrl =
						typeof (data as Record<string, unknown>).redirectUrl === 'string'
							? ((data as Record<string, unknown>).redirectUrl as string)
							: ''

					if (!redirectUrl) break

					setChatMessages(prev => [
						...prev,
						{
							id: makeId('system'),
							playerId: 'system',
							playerName: 'Система',
							text: 'Игра началась! Перенаправление...',
							timestamp: new Date(),
							type: 'system',
						},
					])

					setTimeout(() => router.push(redirectUrl), 700)
					break
				}

				case 'ERROR': {
					const message =
						typeof (data as Record<string, unknown>).message === 'string'
							? ((data as Record<string, unknown>).message as string)
							: 'Произошла ошибка'

					console.error('Server error:', message)

					if (isLobbyPasswordError(message)) {
						hasJoinedRef.current = false
						setPasswordPromptError(message)
						setIsPasswordPromptOpen(true)
						setIsSubmittingLobbyPassword(false)
						setError('')
						break
					}

					setError(message)
					setIsSubmittingLobbyPassword(false)
					break
				}
			}
		},
		[router, currentUserId],
	)

	const wsBase = process.env.NEXT_PUBLIC_WS_BASE || 'http://localhost:4000'
	const lobbyId = lobbyIdFromProps || 'default-lobby'

	const { sendMessage: sendWS, isConnected } = useLobbySocket(
		wsBase,
		handleWebSocketMessage,
		lobbyId,
	)

	useEffect(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}

		if (!isConnected) {
			reconnectTimeoutRef.current = setTimeout(() => {
				hasJoinedRef.current = false
			}, 800)
		}

		return () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current)
				reconnectTimeoutRef.current = null
			}
		}
	}, [isConnected])

	useEffect(() => {
		if (isConnected) setError('')
	}, [isConnected])

	const buildCurrentPlayer = useCallback((): Player | null => {
		if (!currentUserId || !profile.data) return null

		const data = profile.data as unknown as Record<string, unknown>

		return {
			id: currentUserId,
			name: profile.data.username || 'Игрок',
			missions: pickNumber(data.missionsCompleted),
			hours: pickNumber(data.playTime),
			avatar: assets.avatar,
			isReady: false,
		}
	}, [currentUserId, profile.data, assets.avatar])

	const joinCurrentLobby = useCallback(
		(password?: string) => {
			const currentUser = buildCurrentPlayer()
			if (!currentUser) return false

			return sendWS({
				type: 'JOIN_LOBBY',
				player: currentUser,
				password,
			})
		},
		[buildCurrentPlayer, sendWS],
	)

	useEffect(() => {
		if (!isConnected) return
		if (hasJoinedRef.current) return

		const storedPassword = getStoredLobbyPassword(lobbyIdRef.current)
		joinCurrentLobby(storedPassword)
	}, [isConnected, joinCurrentLobby])

	const handleSubmitLobbyPassword = useCallback(
		(password: string) => {
			const normalizedPassword = password.trim()

			if (normalizedPassword.length < 4) {
				setPasswordPromptError('Пароль должен содержать минимум 4 символа')
				return
			}

			setIsSubmittingLobbyPassword(true)
			setPasswordPromptError('')
			saveStoredLobbyPassword(lobbyIdRef.current, normalizedPassword)

			const ok = joinCurrentLobby(normalizedPassword)

			if (!ok) {
				setIsSubmittingLobbyPassword(false)
				setPasswordPromptError(
					'Не удалось отправить пароль. Проверьте соединение',
				)
			}
		},
		[joinCurrentLobby],
	)

	const handleCancelLobbyPassword = useCallback(() => {
		setIsPasswordPromptOpen(false)
		setPasswordPromptError('')
		setIsSubmittingLobbyPassword(false)
		removeStoredLobbyPassword(lobbyIdRef.current)
		router.push('/?openLobbies=1')
	}, [router])

	const handlePlayerMenuClick = useCallback((player: Player) => {
		setSelectedPlayer(player)
		setIsPlayerModalOpen(true)
	}, [])

	const handleClosePlayerModal = useCallback(() => {
		setIsPlayerModalOpen(false)
		setSelectedPlayer(null)
	}, [])

	const isLobbyCreator = useMemo(
		() => lobbyCreatorId === currentUserId,
		[lobbyCreatorId, currentUserId],
	)

	const handleOpenLobbySettings = useCallback(() => {
		if (!isLobbyCreator) {
			alert('Только создатель лобби может менять настройки')
			return
		}

		setShowLobbySettingsModal(true)
	}, [isLobbyCreator])

	const handleSaveLobbySettings = useCallback(
		(settings: LobbySettings) => {
			const normalized = normalizeSettings(settings)
			const rawPassword = (settings.password || '').trim()
			const needsPassword =
				normalized.visibility === 'password' ||
				normalized.visibility === 'hidden_password'
			const outgoingSettings: LobbySettings = {
				...normalized,
				password: needsPassword ? rawPassword : '',
				hasPassword: needsPassword
					? !!settings.hasPassword || rawPassword.length >= 4
					: false,
				searchingPlayers:
					normalized.visibility === 'hidden_password'
						? false
						: !!normalized.searchingPlayers,
			}

			const localSettings: LobbySettings = {
				...outgoingSettings,
				password: '',
			}

			setLobbySettings(localSettings)

			sendWS({
				type: 'UPDATE_LOBBY_SETTINGS',
				settings: outgoingSettings,
				__userId: currentUserId,
			})
		},
		[sendWS, currentUserId],
	)

	const handleMutePlayer = useCallback(() => {}, [])
	const handleVolumeChange = useCallback(() => {}, [])

	const handleAddFriend = useCallback(() => {
		if (selectedPlayer) alert(`Игрок ${selectedPlayer.name} добавлен в друзья!`)
	}, [selectedPlayer])

	const handleRemovePlayer = useCallback(
		(playerId: string) => {
			sendWS({ type: 'PLAYER_LEFT', playerId })
			handleClosePlayerModal()
		},
		[sendWS, handleClosePlayerModal],
	)

	const addNewPlayer = useCallback(
		(playerData?: { id?: string; name?: string; avatar?: string }) => {
			const useMock =
				process.env.NODE_ENV !== 'production' &&
				typeof window !== 'undefined' &&
				(new URLSearchParams(window.location.search).get('wsMock') === '1' ||
					window.localStorage?.getItem('WS_MOCK') === '1' ||
					process.env.NEXT_PUBLIC_WS_MOCK === 'true' ||
					process.env.NEXT_PUBLIC_WS_USE_MOCK === 'true')

			if (!useMock) {
				alert(
					'Добавление игроков вручную недоступно. Пригласите игрока по ссылке или включите мок-режим для теста.',
				)
				return
			}

			if (playersRef.current.length >= lobbySettingsRef.current.maxPlayers) {
				alert(`Достигнут лимит игроков: ${lobbySettingsRef.current.maxPlayers}`)
				return
			}

			const newPlayer: Player = {
				id: playerData?.id || makeId('player'),
				name: playerData?.name || `Игрок${playersRef.current.length + 1}`,
				missions: Math.floor(Math.random() * 50),
				hours: Math.floor(Math.random() * 200),
				avatar: playerData?.avatar,
				isReady: false,
			}

			sendWS({ type: 'JOIN_LOBBY', player: newPlayer })
			setShowAddPlayerModal(false)
		},
		[sendWS],
	)

	const toggleReady = useCallback(() => {
		if (!currentUserId) return

		const currentPlayer = playersRef.current.find(p => p.id === currentUserId)
		if (!currentPlayer) return

		const isReady = !currentPlayer.isReady

		setPlayers(prev =>
			prev.map(p => (p.id === currentUserId ? { ...p, isReady } : p)),
		)

		sendWS({
			type: 'TOGGLE_READY',
			playerId: currentUserId,
			isReady,
			lobbyId: lobbyIdRef.current,
		})
	}, [currentUserId, sendWS])

	const sendChat = useCallback(() => {
		if (!newMessage.trim() || !currentUserId) return

		const id = makeId('msg')

		const localMessage: ChatMessage = {
			id,
			playerId: currentUserId,
			playerName: profile.data?.username || 'Игрок',
			text: newMessage.trim().slice(0, 300),
			timestamp: new Date(),
			type: 'player',
		}

		if (!seenMsgIdsRef.current.has(id)) {
			seenMsgIdsRef.current.add(id)
			setChatMessages(prev => [...prev, localMessage])
		}

		const outgoing = {
			...localMessage,
			timestamp: toIsoTimestamp(localMessage.timestamp),
		}

		const sent = sendWS({ type: 'SEND_MESSAGE', message: outgoing })

		if (sent) {
			setNewMessage('')
			shouldScrollRef.current = true
		}
	}, [newMessage, profile.data, sendWS, currentUserId])

	const handleSendMessage = useCallback(
		(e: FormEvent) => {
			e.preventDefault()
			sendChat()
		},
		[sendChat],
	)

	const handleKeyPress = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				sendChat()
			}
		},
		[sendChat],
	)

	const handleChatScroll = useCallback(() => {
		if (!chatContainerRef.current) return

		const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
		shouldScrollRef.current = scrollHeight - scrollTop - clientHeight < 100
	}, [])

	useEffect(() => {
		if (!shouldScrollRef.current) return

		const el = chatContainerRef.current
		if (!el) return

		el.scrollTop = el.scrollHeight
	}, [chatMessages.length])

	useEffect(() => {
		let cancelled = false

		const init = async () => {
			setIsLoading(true)

			try {
				await loadUserData()
				if (cancelled) return
				checkIconsAvailability().catch(() => {})
			} finally {
				if (!cancelled) setIsLoading(false)
			}
		}

		init()

		return () => {
			cancelled = true
		}
	}, [loadUserData, checkIconsAvailability, lobbyIdFromProps])

	useEffect(() => {
		const uid = profile.data?.id
		if (!uid) return

		loadSavedAssets(uid)
	}, [profile.data?.id, loadSavedAssets])

	const currentUserReadyState = useMemo(
		() => players.find(p => p.id === currentUserId)?.isReady || false,
		[players, currentUserId],
	)

	const handleStartGame = useCallback(() => {
		if (!currentUserId || !isLobbyCreator) {
			alert('Только создатель лобби может начать игру')
			return
		}

		if (players.length < 2) {
			alert('Для начала игры нужно минимум 2 игрока')
			return
		}

		const notReadyPlayers = players.filter(p => !p.isReady)

		if (notReadyPlayers.length > 0) {
			alert(
				`Следующие игроки не готовы: ${notReadyPlayers.map(p => p.name).join(', ')}`,
			)
			return
		}

		sendWS({
			type: 'START_GAME',
			lobbyId: lobbyIdRef.current,
			creatorId: currentUserId,
		})

		setChatMessages(prev => [
			...prev,
			{
				id: makeId('system'),
				playerId: 'system',
				playerName: 'Система',
				text: 'Создатель начал игру...',
				timestamp: new Date(),
				type: 'system',
			},
		])
	}, [sendWS, currentUserId, isLobbyCreator, players])

	return {
		profile,
		assets,
		players,
		chatMessages,
		newMessage,
		isLoading,
		lobbySettings,
		isConnected,
		currentUserReadyState,
		showAddPlayerModal,
		showLobbySettingsModal,
		selectedPlayer,
		isPlayerModalOpen,
		lobbyId,
		chatContainerRef,
		error,
		isLobbyCreator,
		isPasswordPromptOpen,
		passwordPromptError,
		isSubmittingLobbyPassword,
		handleSubmitLobbyPassword,
		handleCancelLobbyPassword,
		handleStartGame,
		setShowAddPlayerModal,
		setShowLobbySettingsModal,
		setNewMessage,
		handlePlayerMenuClick,
		handleClosePlayerModal,
		handleOpenLobbySettings,
		handleSaveLobbySettings,
		handleMutePlayer,
		handleVolumeChange,
		handleAddFriend,
		handleRemovePlayer,
		addNewPlayer,
		toggleReady,
		handleSendMessage,
		handleKeyPress,
		handleChatScroll,
		AddPlayerModal,
		PlayerManagementModal,
		LobbySettingsModal,
	}
}
