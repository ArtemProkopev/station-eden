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

// Разворачиваем возможные вложенные { data: { data: ... } }
function unwrapDataLayers(value: any): any {
	let current = value
	let guard = 0

	while (
		current &&
		typeof current === 'object' &&
		'data' in current &&
		guard < 5
	) {
		current = (current as any).data
		guard++
	}

	return current
}

export default function VoicePanel({
	lobbyId,
	onStatsChange,
}: VoicePanelProps) {
	const [room, setRoom] = useState<Room | null>(null)
	const roomRef = useRef<Room | null>(null)

	const [joining, setJoining] = useState(false)
	const [joined, setJoined] = useState(false)
	const [muted, setMuted] = useState(false)
	const [selfMonitor, setSelfMonitor] = useState(false)
	const [participants, setParticipants] = useState<UiParticipant[]>([])
	const [error, setError] = useState<string>('')
	const [audioBlocked, setAudioBlocked] = useState(false)

	// audio-элементы для удалённых участников: participantSid -> [HTMLAudioElement]
	const audioElementsRef = useRef<Map<string, HTMLAudioElement[]>>(new Map())

	// self-monitor (слышать себя)
	const selfMonitorTrackRef = useRef<LocalAudioTrack | null>(null)
	const selfMonitorAudioRef = useRef<HTMLAudioElement | null>(null)

	// --- sync с карточками игроков в PlayersList ---
	const syncSpeakingToPlayersList = useCallback((list: UiParticipant[]) => {
		if (typeof document === 'undefined') return

		try {
			const cards = Array.from(
				document.querySelectorAll<HTMLElement>('[data-player-id]')
			)

			cards.forEach(card => {
				card.classList.remove('player-speaking')
				card.removeAttribute('data-voice-active')
				card.removeAttribute('data-voice-muted')
			})

			list.forEach(p => {
				if (!p.identity) return

				let id = p.identity

				if (typeof window !== 'undefined' && (window as any).CSS?.escape) {
					try {
						id = (window as any).CSS.escape(p.identity)
					} catch {
						id = p.identity
					}
				}

				const card = document.querySelector<HTMLElement>(
					`[data-player-id="${id}"]`
				)

				if (!card) return

				card.dataset.voiceMuted = p.isMuted ? '1' : '0'

				if (p.isSpeaking && !p.isMuted) {
					card.classList.add('player-speaking')
					card.dataset.voiceActive = '1'
				}
			})
		} catch (e) {
			console.warn('[voice] syncSpeakingToPlayersList failed', e)
		}
	}, [])

	// отдаём статистику наверх (для таба "голосовой чат" в Chat)
	useEffect(() => {
		if (!onStatsChange) return
		const participantsCount = participants.length
		const someoneSpeaking = participants.some(p => p.isSpeaking)
		onStatsChange({ participantsCount, someoneSpeaking })
	}, [participants, onStatsChange])

	// --- работа с токеном /voice/token ---
	const fetchToken = useCallback(async () => {
		const res = await fetch(
			`/api/voice/token?lobbyId=${encodeURIComponent(lobbyId)}`,
			{
				method: 'GET',
				credentials: 'include',
			}
		)

		const text = await res.text()
		let json: any = {}

		try {
			json = text ? JSON.parse(text) : {}
		} catch {
			console.error('[voice] raw response (not JSON):', text)
			throw new Error('Сервер вернул невалидный JSON для токена LiveKit')
		}

		if (!res.ok) {
			console.error('[voice] error response from /api/voice/token:', json)
			let message = 'Не удалось получить токен для голосового чата'
			if (typeof json?.message === 'string') message = json.message
			if (typeof json?.error === 'string') message = json.error
			throw new Error(message)
		}

		const unwrapped = unwrapDataLayers(json)
		const rawToken =
			unwrapped?.token ??
			unwrapped?.accessToken ??
			unwrapped?.authToken ??
			unwrapped

		let token: string | undefined

		if (typeof rawToken === 'string') {
			token = rawToken
		} else if (rawToken && typeof rawToken === 'object') {
			token =
				rawToken.token ??
				rawToken.jwt ??
				rawToken.accessToken ??
				rawToken.authToken
		}

		const urlFromServer: string | undefined =
			unwrapped?.url ?? (rawToken as any)?.url ?? undefined

		if (!token || typeof token !== 'string') {
			console.error('[voice] invalid token response (no token found):', {
				json,
				unwrapped,
			})

			throw new Error(
				'Сервер не вернул корректный токен для LiveKit (поле token / accessToken / authToken / jwt не найдено)'
			)
		}

		return {
			token,
			url: urlFromServer,
		}
	}, [lobbyId])

	// --- обновление списка участников для UI ---
	const updateParticipants = useCallback(
		(r: Room) => {
			const list: UiParticipant[] = []

			const lp: any = r.localParticipant
			if (lp) {
				const audioLevel = typeof lp.audioLevel === 'number' ? lp.audioLevel : 0
				// более чувствительный и быстрый порог
				const speakingFlag =
					audioLevel > 0.003 ||
					(typeof lp.isSpeaking === 'boolean' && lp.isSpeaking)

				const micPub =
					typeof lp.getTrackPublication === 'function'
						? lp.getTrackPublication(Track.Source.Microphone)
						: undefined
				const track = (micPub?.track as LocalAudioTrack | undefined) ?? null
				const trackMuted = !!(
					(track as any)?.isMuted ??
					(track as any)?.muted ??
					micPub?.isMuted
				)
				const micEnabledFlag =
					typeof lp.isMicrophoneEnabled === 'boolean'
						? lp.isMicrophoneEnabled
						: !trackMuted
				const isMuted = !micEnabledFlag || trackMuted

				list.push({
					sid: lp.sid,
					identity: lp.identity || 'Вы',
					isSpeaking: speakingFlag && !isMuted,
					isLocal: true,
					isMuted,
				})
			}

			r.remoteParticipants.forEach(p => {
				const rp: any = p
				const audioLevel = typeof rp.audioLevel === 'number' ? rp.audioLevel : 0
				const speakingFlag =
					audioLevel > 0.003 ||
					(typeof rp.isSpeaking === 'boolean' && rp.isSpeaking)

				const micPub =
					typeof rp.getTrackPublication === 'function'
						? rp.getTrackPublication(Track.Source.Microphone)
						: undefined
				const track = micPub?.track as any
				const trackMuted = !!(track?.isMuted ?? track?.muted ?? micPub?.isMuted)
				const micEnabledFlag =
					typeof rp.isMicrophoneEnabled === 'boolean'
						? rp.isMicrophoneEnabled
						: !trackMuted
				const isMuted = !micEnabledFlag || trackMuted

				list.push({
					sid: rp.sid,
					identity: rp.identity || 'Игрок',
					isSpeaking: speakingFlag && !isMuted,
					isLocal: false,
					isMuted,
				})
			})

			setParticipants(list)
			syncSpeakingToPlayersList(list)
		},
		[syncSpeakingToPlayersList]
	)

	// --- подключение аудио для удалённого участника ---
	const attachAudioForParticipant = useCallback(
		(participantSid: string, track: any) => {
			if (!track || track.kind !== Track.Kind.Audio) return
			if (typeof document === 'undefined') return

			const audioEl = document.createElement('audio')
			audioEl.autoplay = true
			audioEl.controls = false
			audioEl.style.display = 'none'
			audioEl.muted = false
			;(audioEl as any).playsInline = true

			audioEl.onerror = e => {
				console.error('[voice] Audio element error:', e, audioEl.error)
			}

			try {
				// ВАЖНО: не вызываем audioEl.play() вручную.
				// LiveKit будет управлять воспроизведением через startAudio / внутренние механизмы.
				track.attach(audioEl)
			} catch (e) {
				console.error('[voice] attach audio error:', e)
				audioEl.remove()
				return
			}

			document.body.appendChild(audioEl)

			const existing = audioElementsRef.current.get(participantSid) ?? []
			audioElementsRef.current.set(participantSid, [...existing, audioEl])

			console.log(`[voice] Audio attached successfully for ${participantSid}`)

			// Если по какой-то причине canPlaybackAudio = false, показываем кнопку
			const r = roomRef.current
			if (r && !r.canPlaybackAudio) {
				setAudioBlocked(true)
			}
		},
		[]
	)

	const detachAudioForParticipant = useCallback(
		(participantSid: string, track?: any) => {
			const list = audioElementsRef.current.get(participantSid)
			if (!list || list.length === 0) return

			console.log(
				`[voice] Detaching audio for participant ${participantSid}, track ${track?.sid}`
			)

			list.forEach(el => {
				try {
					if (track) {
						track.detach(el)
					}
				} catch (e) {
					console.warn('[voice] detach audio error:', e)
				}
				try {
					el.pause()
				} catch {}
				try {
					// @ts-ignore
					el.srcObject = null
				} catch {}
				el.remove()
			})

			audioElementsRef.current.delete(participantSid)
		},
		[]
	)

	// --- self monitor (слышать себя) ---
	const enableSelfMonitor = useCallback(() => {
		const r = roomRef.current
		if (!r) return

		const lp = r.localParticipant
		const pub = lp.getTrackPublication(Track.Source.Microphone)
		const track = (pub?.track as LocalAudioTrack | undefined) ?? null

		if (!track) {
			console.warn('[voice] no local mic track for self-monitor')
			return
		}

		if (selfMonitorTrackRef.current || selfMonitorAudioRef.current) {
			try {
				if (selfMonitorTrackRef.current && selfMonitorAudioRef.current) {
					selfMonitorTrackRef.current.detach(selfMonitorAudioRef.current)
				}
			} catch {}
			try {
				selfMonitorAudioRef.current?.pause()
			} catch {}
			try {
				// @ts-ignore
				if (selfMonitorAudioRef.current) {
					selfMonitorAudioRef.current.srcObject = null
				}
			} catch {}
			try {
				selfMonitorAudioRef.current?.remove()
			} catch {}
			selfMonitorTrackRef.current = null
			selfMonitorAudioRef.current = null
		}

		const audioEl = document.createElement('audio')
		audioEl.autoplay = true
		audioEl.controls = false
		audioEl.style.display = 'none'
		audioEl.muted = false
		;(audioEl as any).playsInline = true

		try {
			track.attach(audioEl)
			const playResult = audioEl.play()
			if (playResult && typeof (playResult as any).catch === 'function') {
				;(playResult as Promise<void>).catch((err: unknown) => {
					console.warn('[voice] self monitor audioEl.play blocked:', err)
				})
			}
		} catch (e) {
			console.error('[voice] self monitor attach error:', e)
			audioEl.remove()
			return
		}

		document.body.appendChild(audioEl)

		selfMonitorTrackRef.current = track
		selfMonitorAudioRef.current = audioEl
	}, [])

	const disableSelfMonitor = useCallback(() => {
		const track = selfMonitorTrackRef.current
		const el = selfMonitorAudioRef.current

		if (track && el) {
			try {
				track.detach(el)
			} catch (e) {
				console.warn('[voice] self monitor detach error:', e)
			}
		}

		if (el) {
			try {
				el.pause()
			} catch {}
			try {
				// @ts-ignore
				el.srcObject = null
			} catch {}
			try {
				el.remove()
			} catch {}
		}

		selfMonitorTrackRef.current = null
		selfMonitorAudioRef.current = null
	}, [])

	// --- подписка на события комнаты ---
	const attachListeners = useCallback(
		(r: Room) => {
			r.on(RoomEvent.ParticipantConnected, () => {
				console.log('[voice] ParticipantConnected')
				updateParticipants(r)
			})

			r.on(RoomEvent.ParticipantDisconnected, participant => {
				console.log(`[voice] ParticipantDisconnected: ${participant.identity}`)
				detachAudioForParticipant(participant.sid)
				updateParticipants(r)
			})

			r.on(RoomEvent.ActiveSpeakersChanged, () => {
				updateParticipants(r)
			})

			r.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
				console.log('[voice] TrackSubscribed', {
					kind: track.kind,
					participant: participant.identity,
					sid: participant.sid,
					trackSid: track.sid,
					isLocal: participant.isLocal,
				})

				if (!participant.isLocal && track.kind === Track.Kind.Audio) {
					attachAudioForParticipant(participant.sid, track)
				}
			})

			r.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
				console.log('[voice] TrackUnsubscribed', {
					kind: track.kind,
					participant: participant.identity,
					sid: participant.sid,
					trackSid: track.sid,
				})

				if (track.kind === Track.Kind.Audio) {
					detachAudioForParticipant(participant.sid, track)
				}
			})

			// mute / unmute трека (для обновления mute-состояния)
			;(r as any).on?.(RoomEvent.TrackMuted, () => {
				updateParticipants(r)
			})
			;(r as any).on?.(RoomEvent.TrackUnmuted, () => {
				updateParticipants(r)
			})

			// autoplay-политика
			r.on(RoomEvent.AudioPlaybackStatusChanged, () => {
				const canPlay = r.canPlaybackAudio
				setAudioBlocked(!canPlay)
				console.log(
					'[voice] AudioPlaybackStatusChanged, canPlaybackAudio=',
					canPlay
				)
			})

			r.on(RoomEvent.Disconnected, () => {
				console.log('[voice] Room disconnected')
				setJoined(false)
				setMuted(false)
				setParticipants([])
				setAudioBlocked(false)
				syncSpeakingToPlayersList([])
			})
		},
		[
			attachAudioForParticipant,
			detachAudioForParticipant,
			updateParticipants,
			syncSpeakingToPlayersList,
		]
	)

	// --- Подключение к голосовому чату ---
	const joinVoice = useCallback(async () => {
		if (joining || joined) return

		setError('')
		setJoining(true)

		// очищаем предыдущие audio-элементы
		try {
			audioElementsRef.current.forEach(els => {
				els.forEach(el => {
					try {
						el.pause()
					} catch {}
					try {
						// @ts-ignore
						el.srcObject = null
					} catch {}
					try {
						el.remove()
					} catch {}
				})
			})
			audioElementsRef.current.clear()
		} catch (e) {
			console.warn(
				'[voice] error while cleaning audio elements before join:',
				e
			)
		}

		try {
			const { token, url } = await fetchToken()

			const connectUrl = url || LIVEKIT_URL
			if (!connectUrl) {
				throw new Error(
					'LiveKit URL не настроен. Задай NEXT_PUBLIC_LIVEKIT_URL или верни url из /api/voice/token'
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

			await newRoom.connect(connectUrl, token, {
				autoSubscribe: true,
			})

			console.log(
				'[voice] Connected to room, local participant:',
				newRoom.localParticipant.identity
			)

			roomRef.current = newRoom
			setRoom(newRoom)
			setJoined(true)
			updateParticipants(newRoom)

			// стартуем аудио в рамках onClick-ивента
			try {
				await newRoom.startAudio()
				setAudioBlocked(!newRoom.canPlaybackAudio)
				console.log(
					'[voice] Audio started, canPlaybackAudio =',
					newRoom.canPlaybackAudio
				)
			} catch (e: unknown) {
				console.warn('[voice] startAudio blocked:', e)
				setAudioBlocked(true)
			}

			// включаем микрофон
			try {
				await newRoom.localParticipant.setMicrophoneEnabled(true)
				setMuted(false)
				console.log('[voice] Microphone enabled')
				updateParticipants(newRoom)
			} catch (e: unknown) {
				console.error('[voice] failed to enable microphone:', e)
				setMuted(true)
				updateParticipants(newRoom)
			}
		} catch (e: any) {
			console.error('[voice] join error:', e)
			setError(e?.message || 'Ошибка подключения к голосовому чату')
			roomRef.current = null
			setJoined(false)
			setRoom(null)
			setParticipants([])
			setAudioBlocked(false)
			syncSpeakingToPlayersList([])
		} finally {
			setJoining(false)
		}
	}, [
		attachListeners,
		fetchToken,
		joined,
		joining,
		updateParticipants,
		syncSpeakingToPlayersList,
	])

	// --- Отключение от голосового чата ---
	const leaveVoice = useCallback(async () => {
		const r = roomRef.current
		if (!r) return

		console.log('[voice] Leaving voice chat')

		try {
			disableSelfMonitor()
			setSelfMonitor(false)

			try {
				await r.localParticipant.setMicrophoneEnabled(false)
			} catch (e: unknown) {
				console.warn('[voice] error while disabling mic on leave:', e)
			}

			audioElementsRef.current.forEach(els => {
				els.forEach(el => {
					try {
						el.pause()
					} catch {}
					try {
						// @ts-ignore
						el.srcObject = null
					} catch {}
					try {
						el.remove()
					} catch {}
				})
			})
			audioElementsRef.current.clear()
		} catch (e: unknown) {
			console.warn('[voice] error while cleaning audio elements:', e)
		}

		try {
			r.disconnect()
			r.removeAllListeners()
		} catch (e) {
			console.warn('[voice] error while disconnecting room:', e)
		}

		roomRef.current = null
		setRoom(null)
		setJoined(false)
		setMuted(false)
		setParticipants([])
		setAudioBlocked(false)
		syncSpeakingToPlayersList([])
	}, [disableSelfMonitor, syncSpeakingToPlayersList])

	const toggleMute = useCallback(async () => {
		const r = roomRef.current
		if (!r) return

		try {
			const lp: any = r.localParticipant

			const micPub = lp.getTrackPublication
				? lp.getTrackPublication(Track.Source.Microphone)
				: undefined
			const track = micPub?.track as LocalAudioTrack | undefined
			const trackMuted = !!(
				(track as any)?.isMuted ??
				(track as any)?.muted ??
				micPub?.isMuted
			)

			const isMicEnabledFromRoom =
				typeof lp.isMicrophoneEnabled === 'boolean'
					? lp.isMicrophoneEnabled
					: !trackMuted

			const nextEnabled = !isMicEnabledFromRoom
			const nextMuted = !nextEnabled

			if (nextMuted) {
				disableSelfMonitor()
				setSelfMonitor(false)
			}

			await r.localParticipant.setMicrophoneEnabled(nextEnabled)

			if (track) {
				try {
					if (nextMuted) {
						await track.mute()
					} else {
						await track.unmute()
					}
				} catch (trackErr) {
					console.warn('[voice] toggleMute track mute/unmute failed:', trackErr)
				}
			}

			setMuted(nextMuted)
			updateParticipants(r)
			console.log(`[voice] Microphone ${nextMuted ? 'muted' : 'unmuted'}`)
		} catch (e: unknown) {
			console.error('[voice] toggleMute error:', e)
		}
	}, [disableSelfMonitor, updateParticipants])

	const toggleSelfMonitor = useCallback(async () => {
		const r = roomRef.current
		if (!r) return

		try {
			if (selfMonitor) {
				disableSelfMonitor()
				setSelfMonitor(false)
				return
			}

			if (muted) {
				try {
					await r.localParticipant.setMicrophoneEnabled(true)
					setMuted(false)
					updateParticipants(r)
				} catch (e: unknown) {
					console.error('[voice] failed to enable mic for self monitor:', e)
				}
			}

			enableSelfMonitor()
			setSelfMonitor(true)
		} catch (e: unknown) {
			console.error('[voice] toggleSelfMonitor error:', e)
		}
	}, [
		selfMonitor,
		muted,
		enableSelfMonitor,
		disableSelfMonitor,
		updateParticipants,
	])

	// Периодический опрос audioLevel для более "живого" индикатора (ближе к Discord)
	useEffect(() => {
		if (!joined) return
		const id = setInterval(() => {
			const r = roomRef.current
			if (!r) return
			updateParticipants(r)
		}, 120) // ~8 раз в секунду
		return () => clearInterval(id)
	}, [joined, updateParticipants])

	// cleanup при размонтировании компонента
	useEffect(() => {
		return () => {
			try {
				disableSelfMonitor()
			} catch {}

			try {
				audioElementsRef.current.forEach(els => {
					els.forEach(el => {
						try {
							el.pause()
						} catch {}
						try {
							// @ts-ignore
							el.srcObject = null
						} catch {}
						try {
							el.remove()
						} catch {}
					})
				})
				audioElementsRef.current.clear()
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

			try {
				syncSpeakingToPlayersList([])
			} catch {}
		}
	}, [disableSelfMonitor, syncSpeakingToPlayersList])

	// ---- вычисления для UI ----
	const participantsCount = participants.length
	const hasParticipants = participantsCount > 0

	const participantsLabel = !hasParticipants
		? 'Никого в голосовом чате'
		: participantsCount === 1
			? '1 игрок в голосе'
			: `${participantsCount} игрока в голосе`

	const someoneSpeaking = participants.some(p => p.isSpeaking)

	const statusText = !joined
		? 'Нажмите «Подключиться», чтобы войти в голосовой чат'
		: muted
			? 'Вы в голосе, микрофон выключен'
			: 'Вы в голосе, говорите свободно'

	const joinLabel = joining ? 'Подключение...' : 'Подключиться'
	const joinDataText = joining ? 'WAIT' : 'JOIN'

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
						<span className={styles.title}>Голосовой чат</span>
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

			<div className={styles.statusRow}>
				<span className={styles.connectionStatus}>{statusText}</span>
			</div>

			<div
				className={`${styles.buttonsRow} ${
					!joined ? styles.buttonsRowCentered : ''
				}`}
			>
				{!joined ? (
					<button
						className={styles.glitchButton}
						onClick={joinVoice}
						disabled={joining}
						data-text={joinDataText}
					>
						{joinLabel}
					</button>
				) : (
					<>
						<button
							className={`${styles.controlButton} ${
								muted ? styles.controlButtonMuted : ''
							}`}
							onClick={toggleMute}
						>
							{muted ? 'Включить микрофон' : 'Выключить микрофон'}
						</button>

						{audioBlocked && (
							<button
								className={styles.controlButton}
								onClick={async () => {
									const r = roomRef.current
									if (!r) return
									try {
										await r.startAudio()
										const canPlay = r.canPlaybackAudio
										setAudioBlocked(!canPlay)
										console.log(
											'[voice] manual startAudio, canPlaybackAudio =',
											canPlay
										)
									} catch (err: unknown) {
										console.warn('[voice] manual startAudio failed:', err)
										setAudioBlocked(true)
									}
								}}
							>
								Включить звук
							</button>
						)}

						<div className={styles.actionGroup}>
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
					</>
				)}
			</div>

			{error && <div className={styles.error}>{error}</div>}
		</div>
	)
}
