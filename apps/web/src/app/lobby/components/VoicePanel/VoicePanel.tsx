// apps/web/src/app/lobby/components/VoicePanel/VoicePanel.tsx
'use client'

import { LocalAudioTrack, Room, RoomEvent, Track } from 'livekit-client'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './VoicePanel.module.css'

type VoicePanelProps = {
	lobbyId: string
	onStatsChange?: (stats: {
		participantsCount: number
		someoneSpeaking: boolean
	}) => void
}

type UiParticipant = {
	sid: string
	identity: string
	isSpeaking: boolean
	isLocal: boolean
	isMuted: boolean
}

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL

function isRecord(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v)
}

function unwrapDataLayers(value: unknown): unknown {
	let current: unknown = value
	let guard = 0

	while (isRecord(current) && 'data' in current && guard < 5) {
		current = (current as Record<string, unknown>).data
		guard++
	}
	return current
}

// Минимально нужный shape публикации микрофона (без any)
type TrackPublicationLike = {
	track?: unknown
	isMuted?: boolean
}

type ParticipantLike = {
	sid: string
	identity: string
	audioLevel?: number
	isSpeaking?: boolean
	isLocal?: boolean
	isMicrophoneEnabled?: boolean
	getTrackPublication?: (
		source: Track.Source,
	) => TrackPublicationLike | undefined
}

function asParticipantLike(v: unknown): ParticipantLike | null {
	if (!v || typeof v !== 'object') return null
	const p = v as ParticipantLike
	if (typeof p.sid !== 'string') return null
	if (typeof p.identity !== 'string') return null
	return p
}

function getMicrophonePublication(
	p: unknown,
): TrackPublicationLike | undefined {
	const pl = asParticipantLike(p)
	return pl?.getTrackPublication?.(Track.Source.Microphone)
}

function isLocalAudioTrack(v: unknown): v is LocalAudioTrack {
	return v instanceof LocalAudioTrack
}

export default function VoicePanel({
	lobbyId,
	onStatsChange,
}: VoicePanelProps) {
	const roomRef = useRef<Room | null>(null)

	const [joining, setJoining] = useState(false)
	const [joined, setJoined] = useState(false)

	// muted=true => микрофон НЕ публикуется в комнату
	const [muted, setMuted] = useState(false)

	const [selfMonitor, setSelfMonitor] = useState(false)
	const selfMonitorActiveRef = useRef(false)

	const [participants, setParticipants] = useState<UiParticipant[]>([])
	const [error, setError] = useState<string>('')
	const [audioBlocked, setAudioBlocked] = useState(false)

	// запоминаем состояние микрофона перед self-monitor
	const micEnabledBeforeSelfMonitorRef = useRef<boolean>(true)

	// audio-элементы для удалённых участников: participantSid -> [HTMLAudioElement]
	const audioElementsRef = useRef<Map<string, HTMLAudioElement[]>>(new Map())

	// self-monitor (локальный getUserMedia)
	const selfMonitorStreamRef = useRef<MediaStream | null>(null)
	const selfMonitorAudioRef = useRef<HTMLAudioElement | null>(null)

	const setRemoteAudioMuted = useCallback((flag: boolean) => {
		try {
			audioElementsRef.current.forEach(els => {
				els.forEach(el => {
					try {
						el.muted = flag
						el.volume = flag ? 0 : 1
					} catch {}
				})
			})
		} catch (e: unknown) {
			console.warn('[voice] setRemoteAudioMuted error:', e)
		}
	}, [])

	const syncSpeakingToPlayersList = useCallback((list: UiParticipant[]) => {
		if (typeof document === 'undefined') return

		try {
			const cards = Array.from(
				document.querySelectorAll<HTMLElement>('[data-player-id]'),
			)

			cards.forEach(card => {
				card.classList.remove('player-speaking')
				card.removeAttribute('data-voice-active')
				card.removeAttribute('data-voice-muted')
			})

			list.forEach(p => {
				if (!p.identity) return
				let id = p.identity

				const cssEscape =
					typeof window !== 'undefined' &&
					typeof window.CSS?.escape === 'function'
						? window.CSS.escape
						: null

				if (cssEscape) {
					try {
						id = cssEscape(p.identity)
					} catch {
						id = p.identity
					}
				}

				const card = document.querySelector<HTMLElement>(
					`[data-player-id="${id}"]`,
				)
				if (!card) return

				card.dataset.voiceMuted = p.isMuted ? '1' : '0'

				if (p.isSpeaking && !p.isMuted) {
					card.classList.add('player-speaking')
					card.dataset.voiceActive = '1'
				}
			})
		} catch (e: unknown) {
			console.warn('[voice] syncSpeakingToPlayersList failed', e)
		}
	}, [])

	useEffect(() => {
		if (!onStatsChange) return
		const participantsCount = participants.length
		const someoneSpeaking = participants.some(p => p.isSpeaking)
		onStatsChange({ participantsCount, someoneSpeaking })
	}, [participants, onStatsChange])

	const fetchToken = useCallback(async () => {
		const res = await fetch(
			`/api/voice/token?lobbyId=${encodeURIComponent(lobbyId)}`,
			{ method: 'GET', credentials: 'include' },
		)

		const text = await res.text()
		let json: unknown = {}

		try {
			json = text ? (JSON.parse(text) as unknown) : {}
		} catch {
			console.error('[voice] raw response (not JSON):', text)
			throw new Error('Сервер вернул невалидный JSON для токена LiveKit')
		}

		if (!res.ok) {
			console.error('[voice] error response from /api/voice/token:', json)
			let message = 'Не удалось получить токен для голосового чата'
			if (isRecord(json) && typeof json.message === 'string')
				message = json.message
			if (isRecord(json) && typeof json.error === 'string') message = json.error
			throw new Error(message)
		}

		const unwrapped = unwrapDataLayers(json)

		let token: string | undefined
		let urlFromServer: string | undefined

		if (typeof unwrapped === 'string') {
			token = unwrapped
		} else if (isRecord(unwrapped)) {
			const rawToken =
				unwrapped.token ??
				unwrapped.accessToken ??
				unwrapped.authToken ??
				unwrapped.jwt
			if (typeof rawToken === 'string') token = rawToken
			if (typeof unwrapped.url === 'string') urlFromServer = unwrapped.url
		}

		if (!token) {
			throw new Error(
				'Сервер не вернул корректный токен для LiveKit (поле token / accessToken / authToken / jwt не найдено)',
			)
		}

		return { token, url: urlFromServer }
	}, [lobbyId])

	const updateParticipants = useCallback(
		(r: Room) => {
			const list: UiParticipant[] = []

			const lpLike = asParticipantLike(r.localParticipant)
			if (lpLike) {
				const audioLevel =
					typeof lpLike.audioLevel === 'number' ? lpLike.audioLevel : 0

				const micEnabledFromSdk =
					typeof lpLike.isMicrophoneEnabled === 'boolean'
						? lpLike.isMicrophoneEnabled
						: true

				const micEnabledForRoom = selfMonitorActiveRef.current
					? false
					: micEnabledFromSdk

				const isMutedFlag = !micEnabledForRoom
				const speakingFlag =
					(audioLevel > 0.003 ||
						(typeof lpLike.isSpeaking === 'boolean' && lpLike.isSpeaking)) &&
					!isMutedFlag

				list.push({
					sid: lpLike.sid,
					identity: lpLike.identity || 'Вы',
					isSpeaking: speakingFlag,
					isLocal: true,
					isMuted: isMutedFlag,
				})
			}

			r.remoteParticipants.forEach(p => {
				const rpLike = asParticipantLike(p)
				if (!rpLike) return

				const audioLevel =
					typeof rpLike.audioLevel === 'number' ? rpLike.audioLevel : 0

				const micPub = rpLike.getTrackPublication?.(Track.Source.Microphone)
				const track = micPub?.track
				const trackMuted = !!(isRecord(track) &&
				('isMuted' in track || 'muted' in track)
					? ((track as Record<string, unknown>).isMuted ??
						(track as Record<string, unknown>).muted)
					: micPub?.isMuted)

				const micEnabledFlag =
					typeof rpLike.isMicrophoneEnabled === 'boolean'
						? rpLike.isMicrophoneEnabled
						: !trackMuted

				const isMutedFlag = !micEnabledFlag || !!trackMuted

				const speakingFlag =
					(audioLevel > 0.003 ||
						(typeof rpLike.isSpeaking === 'boolean' && rpLike.isSpeaking)) &&
					!isMutedFlag

				list.push({
					sid: rpLike.sid,
					identity: rpLike.identity || 'Игрок',
					isSpeaking: speakingFlag,
					isLocal: false,
					isMuted: isMutedFlag,
				})
			})

			setParticipants(list)
			syncSpeakingToPlayersList(list)
		},
		[syncSpeakingToPlayersList],
	)

	const attachAudioForParticipant = useCallback(
		(participantSid: string, track: Track) => {
			if (!track || track.kind !== Track.Kind.Audio) return
			if (typeof document === 'undefined') return

			const audioEl = document.createElement('audio')
			audioEl.autoplay = true
			audioEl.controls = false
			audioEl.style.display = 'none'
			audioEl.muted = false
			audioEl.setAttribute('playsinline', 'true')

			audioEl.onerror = e => {
				console.error('[voice] Audio element error:', e, audioEl.error)
			}

			try {
				track.attach(audioEl)
			} catch (e: unknown) {
				console.error('[voice] attach audio error:', e)
				audioEl.remove()
				return
			}

			document.body.appendChild(audioEl)

			const existing = audioElementsRef.current.get(participantSid) ?? []
			audioElementsRef.current.set(participantSid, [...existing, audioEl])

			const r = roomRef.current
			if (r && !r.canPlaybackAudio) setAudioBlocked(true)
		},
		[],
	)

	const detachAudioForParticipant = useCallback(
		(participantSid: string, track?: Track) => {
			const list = audioElementsRef.current.get(participantSid)
			if (!list || list.length === 0) return

			list.forEach(el => {
				try {
					if (track) track.detach(el)
				} catch {}
				try {
					el.pause()
				} catch {}
				try {
					;(el as HTMLMediaElement).srcObject = null
				} catch {}
				el.remove()
			})

			audioElementsRef.current.delete(participantSid)
		},
		[],
	)

	const disableSelfMonitor = useCallback(() => {
		if (typeof document !== 'undefined') {
			document
				.querySelectorAll<HTMLAudioElement>('audio[data-self-monitor="1"]')
				.forEach(el => {
					try {
						el.pause()
					} catch {}
					try {
						;(el as HTMLMediaElement).srcObject = null
					} catch {}
					try {
						el.remove()
					} catch {}
				})
		}

		const stream = selfMonitorStreamRef.current
		if (stream) {
			try {
				stream.getTracks().forEach(t => {
					try {
						t.stop()
					} catch {}
				})
			} catch {}
		}

		selfMonitorStreamRef.current = null
		selfMonitorAudioRef.current = null
	}, [])

	const enableSelfMonitor = useCallback(async () => {
		disableSelfMonitor()

		if (
			typeof navigator === 'undefined' ||
			!navigator.mediaDevices?.getUserMedia
		) {
			console.warn('[voice] getUserMedia not available for self-monitor')
			return
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: { echoCancellation: true, noiseSuppression: true },
				video: false,
			})

			const audioEl = document.createElement('audio')
			audioEl.autoplay = true
			audioEl.controls = false
			audioEl.style.display = 'none'
			audioEl.muted = false
			audioEl.setAttribute('playsinline', 'true')
			audioEl.dataset.selfMonitor = '1'
			;(audioEl as HTMLMediaElement).srcObject = stream

			const playResult = audioEl.play()
			if (
				playResult &&
				typeof (playResult as Promise<void>).catch === 'function'
			) {
				;(playResult as Promise<void>).catch(err => {
					console.warn('[voice] self monitor audio play blocked:', err)
				})
			}

			document.body.appendChild(audioEl)

			selfMonitorStreamRef.current = stream
			selfMonitorAudioRef.current = audioEl
		} catch (e: unknown) {
			console.error('[voice] self monitor getUserMedia error:', e)
		}
	}, [disableSelfMonitor])

	const attachListeners = useCallback(
		(r: Room) => {
			r.on(RoomEvent.ParticipantConnected, () => updateParticipants(r))

			r.on(RoomEvent.ParticipantDisconnected, participant => {
				detachAudioForParticipant(participant.sid)
				updateParticipants(r)
			})

			r.on(RoomEvent.ActiveSpeakersChanged, () => updateParticipants(r))

			r.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
				if (!participant.isLocal && track.kind === Track.Kind.Audio) {
					attachAudioForParticipant(participant.sid, track)

					// если self-monitor активен — новые треки тоже глушим
					if (selfMonitorActiveRef.current) setRemoteAudioMuted(true)
				}
			})

			r.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
				if (track.kind === Track.Kind.Audio) {
					detachAudioForParticipant(participant.sid, track)
				}
			})

			r.on(RoomEvent.AudioPlaybackStatusChanged, () => {
				setAudioBlocked(!r.canPlaybackAudio)
			})

			r.on(RoomEvent.Disconnected, () => {
				selfMonitorActiveRef.current = false
				setJoined(false)
				setMuted(false)
				setParticipants([])
				setAudioBlocked(false)
				setSelfMonitor(false)
				setRemoteAudioMuted(false)
				syncSpeakingToPlayersList([])
			})
		},
		[
			attachAudioForParticipant,
			detachAudioForParticipant,
			setRemoteAudioMuted,
			syncSpeakingToPlayersList,
			updateParticipants,
		],
	)

	const joinVoice = useCallback(async () => {
		if (joining || joined) return

		setError('')
		setJoining(true)

		try {
			const { token, url } = await fetchToken()
			const connectUrl = url || LIVEKIT_URL
			if (!connectUrl) {
				throw new Error(
					'LiveKit URL не настроен. Задай NEXT_PUBLIC_LIVEKIT_URL или верни url из /api/voice/token',
				)
			}

			const newRoom = new Room({
				adaptiveStream: false,
				dynacast: true,
				audioCaptureDefaults: {
					autoGainControl: false,
					echoCancellation: true,
					noiseSuppression: true,
					channelCount: 1,
					sampleRate: 48000,
				},
				publishDefaults: {
					simulcast: false,
					stopMicTrackOnMute: true,
				},
			})

			attachListeners(newRoom)
			await newRoom.connect(connectUrl, token, { autoSubscribe: true })

			roomRef.current = newRoom
			setJoined(true)

			newRoom
				.startAudio()
				.then(() => setAudioBlocked(!newRoom.canPlaybackAudio))
				.catch(() => setAudioBlocked(true))

			selfMonitorActiveRef.current = false
			setSelfMonitor(false)
			setRemoteAudioMuted(false)

			try {
				await newRoom.localParticipant.setMicrophoneEnabled(true)
				setMuted(false)
			} catch (e: unknown) {
				console.error('[voice] failed to enable microphone:', e)
				setMuted(true)
			}

			updateParticipants(newRoom)
		} catch (e: unknown) {
			console.error('[voice] join error:', e)
			setError(
				e instanceof Error ? e.message : 'Ошибка подключения к голосовому чату',
			)

			roomRef.current = null
			setJoined(false)
			setParticipants([])
			setAudioBlocked(false)
			selfMonitorActiveRef.current = false
			setSelfMonitor(false)
			setRemoteAudioMuted(false)
			syncSpeakingToPlayersList([])
		} finally {
			setJoining(false)
		}
	}, [
		attachListeners,
		fetchToken,
		joined,
		joining,
		setRemoteAudioMuted,
		syncSpeakingToPlayersList,
		updateParticipants,
	])

	const leaveVoice = useCallback(async () => {
		const r = roomRef.current
		if (!r) return

		try {
			disableSelfMonitor()
			selfMonitorActiveRef.current = false
			setSelfMonitor(false)
			setRemoteAudioMuted(false)

			try {
				await r.localParticipant.setMicrophoneEnabled(false)
			} catch {}

			// жёсткий stop локального трека без any
			try {
				const pub = getMicrophonePublication(r.localParticipant)
				const t = pub?.track
				if (isLocalAudioTrack(t)) {
					try {
						await r.localParticipant.unpublishTrack(t)
					} catch {}
					try {
						t.stop()
					} catch {}
				}
			} catch {}

			// чистим remote audio
			audioElementsRef.current.forEach(els => {
				els.forEach(el => {
					try {
						el.pause()
					} catch {}
					try {
						;(el as HTMLMediaElement).srcObject = null
					} catch {}
					try {
						el.remove()
					} catch {}
				})
			})
			audioElementsRef.current.clear()
		} finally {
			try {
				r.disconnect()
				r.removeAllListeners()
			} catch {}

			roomRef.current = null
			setJoined(false)
			setMuted(false)
			setParticipants([])
			setAudioBlocked(false)
			syncSpeakingToPlayersList([])
		}
	}, [disableSelfMonitor, setRemoteAudioMuted, syncSpeakingToPlayersList])

	const toggleMute = useCallback(async () => {
		const r = roomRef.current
		if (!r) return

		// в self-monitor публикация всегда выключена
		if (selfMonitorActiveRef.current) return

		try {
			const nextEnabled = muted // muted=true => включаем
			await r.localParticipant.setMicrophoneEnabled(nextEnabled)

			// добиваем трек, если это LocalAudioTrack
			const pub = getMicrophonePublication(r.localParticipant)
			const t = pub?.track
			if (isLocalAudioTrack(t)) {
				try {
					if (nextEnabled) await t.unmute()
					else await t.mute()
				} catch {}
			}

			setMuted(!nextEnabled)
			updateParticipants(r)
		} catch (e: unknown) {
			console.error('[voice] toggleMute error:', e)
		}
	}, [muted, updateParticipants])

	const toggleSelfMonitor = useCallback(async () => {
		const r = roomRef.current
		if (!r) return

		try {
			if (selfMonitorActiveRef.current) {
				// выключаем self-monitor
				disableSelfMonitor()
				selfMonitorActiveRef.current = false
				setSelfMonitor(false)
				setRemoteAudioMuted(false)

				// восстановить микрофон как был
				const shouldEnable = micEnabledBeforeSelfMonitorRef.current
				try {
					await r.localParticipant.setMicrophoneEnabled(shouldEnable)
				} catch {}
				setMuted(!shouldEnable)

				updateParticipants(r)
				return
			}

			// включаем self-monitor
			micEnabledBeforeSelfMonitorRef.current = !muted

			// выключить микрофон для других
			try {
				await r.localParticipant.setMicrophoneEnabled(false)
			} catch {}
			setMuted(true)

			// выключить звук других локально
			setRemoteAudioMuted(true)

			await enableSelfMonitor()

			selfMonitorActiveRef.current = true
			setSelfMonitor(true)

			updateParticipants(r)
		} catch (e: unknown) {
			console.error('[voice] toggleSelfMonitor error:', e)
		}
	}, [
		disableSelfMonitor,
		enableSelfMonitor,
		muted,
		setRemoteAudioMuted,
		updateParticipants,
	])

	useEffect(() => {
		if (!joined) return
		const id = setInterval(() => {
			const r = roomRef.current
			if (!r) return
			updateParticipants(r)
		}, 120)
		return () => clearInterval(id)
	}, [joined, updateParticipants])

	useEffect(() => {
		const handler = () => void leaveVoice()
		window.addEventListener('pagehide', handler)
		return () => window.removeEventListener('pagehide', handler)
	}, [leaveVoice])

	useEffect(() => {
		return () => {
			try {
				disableSelfMonitor()
			} catch {}

			try {
				// eslint warning fix: копируем ref в переменную
				const map = audioElementsRef.current
				map.forEach(els => {
					els.forEach(el => {
						try {
							el.pause()
						} catch {}
						try {
							;(el as HTMLMediaElement).srcObject = null
						} catch {}
						try {
							el.remove()
						} catch {}
					})
				})
				map.clear()
			} catch {}

			const r = roomRef.current
			if (r) {
				try {
					r.localParticipant.setMicrophoneEnabled(false)
				} catch {}
				try {
					r.disconnect()
					r.removeAllListeners()
				} catch {}
			}

			roomRef.current = null
			selfMonitorActiveRef.current = false

			try {
				syncSpeakingToPlayersList([])
			} catch {}
		}
	}, [disableSelfMonitor, syncSpeakingToPlayersList])

	// ---- UI ----
	const participantsCount = participants.length
	const hasParticipantsInRoom = participantsCount > 0
	const hasParticipants = joined && hasParticipantsInRoom
	const participantsLabel = !joined
		? 'Подключитесь, чтобы увидеть, кто в голосе'
		: !hasParticipantsInRoom
			? 'Никого в голосе'
			: participantsCount === 1
				? '1 игрок в голосе'
				: `${participantsCount} игрока в голосе`

	const someoneSpeaking = participants.some(p => p.isSpeaking)

	return (
		<div
			className={`${styles.voiceBlock} ${
				someoneSpeaking ? styles.voiceActive : ''
			}`}
		>
			<div className={styles.headerRow}>
				<div className={styles.loader} aria-hidden='true'>
					<span className={styles.bar} />
					<span className={styles.bar} />
					<span className={styles.bar} />
				</div>

				<div className={styles.headerMain}>
					<div className={styles.titleColumn}>
						<span className={styles.title}>Голос</span>
						<span
							className={`${styles.participantsLabel} ${
								!hasParticipants
									? styles.participantsLabelEmpty
									: styles.participantsLabelHasPlayers
							} ${someoneSpeaking ? styles.participantsLabelSpeaking : ''}`}
						>
							{participantsLabel}
						</span>
					</div>

					<span
						className={`${styles.statusBadge} ${
							joined
								? styles['statusBadge--connected']
								: styles['statusBadge--disconnected']
						}`}
					>
						{joined ? 'Подключен' : 'Отключен'}
					</span>
				</div>
			</div>

			<div
				className={`${styles.buttonsRow} ${
					!joined ? styles.buttonsRowCentered : styles.buttonsRowJoined
				}`}
			>
				{!joined ? (
					joining ? (
						<div className={styles.connectingWrapper}>
							<div
								className={styles.connectingGlitch}
								data-glitch='Подключение'
							>
								Подключение
								<span className={styles.connectingDots}>
									<span className={styles.connectingDot}>.</span>
									<span className={styles.connectingDot}>.</span>
									<span className={styles.connectingDot}>.</span>
								</span>
							</div>
						</div>
					) : (
						<button
							className={styles.glitchButton}
							onClick={joinVoice}
							disabled={joining}
							data-text='JOIN'
						>
							Подключиться
						</button>
					)
				) : (
					<>
						<div className={styles.buttonsGroupLeft}>
							<button
								className={`${styles.controlButton} ${
									muted ? styles.controlButtonMuted : ''
								}`}
								onClick={toggleMute}
								disabled={selfMonitor}
								title={
									selfMonitor
										? 'В режиме "Слышать себя" микрофон для комнаты всегда выключен'
										: ''
								}
							>
								{muted ? 'Включить микрофон' : 'Выключить микрофон'}
							</button>

							<button
								className={`${styles.controlButton} ${
									selfMonitor ? styles.controlButtonActive : ''
								}`}
								onClick={toggleSelfMonitor}
							>
								{selfMonitor ? 'Скрыть себя' : 'Слышать себя'}
							</button>

							<button
								className={`${styles.controlButton} ${styles.controlButtonDanger}`}
								onClick={leaveVoice}
							>
								Выйти
							</button>
						</div>

						{audioBlocked && (
							<button
								className={`${styles.controlButton} ${styles.audioButtonRight}`}
								onClick={async () => {
									const r = roomRef.current
									if (!r) return
									try {
										await r.startAudio()
										setAudioBlocked(!r.canPlaybackAudio)
									} catch (err: unknown) {
										console.warn('[voice] manual startAudio failed:', err)
										setAudioBlocked(true)
									}
								}}
							>
								Включить звук
							</button>
						)}
					</>
				)}
			</div>

			{error && <div className={styles.error}>{error}</div>}
		</div>
	)
}
