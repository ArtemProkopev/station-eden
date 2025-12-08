// apps/web/src/app/lobby/components/VoicePanel/VoicePanel.tsx
'use client'

import { LocalAudioTrack, Room, RoomEvent, Track } from 'livekit-client'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './VoicePanel.module.css'

type VoicePanelProps = {
	lobbyId: string
}

type UiParticipant = {
	sid: string
	identity: string
	isSpeaking: boolean
	isLocal: boolean
}

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL

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

export function VoicePanel({ lobbyId }: VoicePanelProps) {
	const [room, setRoom] = useState<Room | null>(null)
	const [joining, setJoining] = useState(false)
	const [joined, setJoined] = useState(false)
	const [muted, setMuted] = useState(false)
	const [selfMonitor, setSelfMonitor] = useState(false)
	const [participants, setParticipants] = useState<UiParticipant[]>([])
	const [error, setError] = useState<string>('')

	// скрытые <audio> для удалённых участников
	const audioElementsRef = useRef<Map<string, HTMLAudioElement[]>>(new Map())

	// самопрослушка: локальный трек + <audio>
	const selfMonitorTrackRef = useRef<LocalAudioTrack | null>(null)
	const selfMonitorAudioRef = useRef<HTMLAudioElement | null>(null)

	const syncSpeakingToPlayersList = useCallback((list: UiParticipant[]) => {
		if (typeof document === 'undefined') return

		try {
			const cards = Array.from(
				document.querySelectorAll<HTMLElement>('[data-player-id]')
			)

			// сброс состояния
			cards.forEach(card => {
				card.classList.remove('player-speaking')
				card.removeAttribute('data-voice-active')
			})

			// подсветка говорящих
			list.forEach(p => {
				if (!p.isSpeaking || !p.identity) return

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

				if (card) {
					card.classList.add('player-speaking')
					card.dataset.voiceActive = '1'
				}
			})
		} catch (e) {
			console.warn('[voice] syncSpeakingToPlayersList failed', e)
		}
	}, [])

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
			throw new Error(
				'Сервер не вернул корректный токен для LiveKit (см. ответ и rawToken в консоли)'
			)
		}

		return {
			token,
			url: urlFromServer,
		}
	}, [lobbyId])

	const updateParticipants = useCallback(
		(r: Room) => {
			const list: UiParticipant[] = []

			const lp = r.localParticipant
			if (lp) {
				list.push({
					sid: lp.sid,
					identity: lp.identity || 'Вы',
					isSpeaking: (lp as any).isSpeaking ?? false,
					isLocal: true,
				})
			}

			r.remoteParticipants.forEach(p => {
				list.push({
					sid: p.sid,
					identity: p.identity || 'Игрок',
					isSpeaking: (p as any).isSpeaking ?? false,
					isLocal: false,
				})
			})

			setParticipants(list)
			syncSpeakingToPlayersList(list)
		},
		[syncSpeakingToPlayersList]
	)

	const attachAudioForParticipant = useCallback(
		(participantSid: string, track: any) => {
			if (!track || track.kind !== Track.Kind.Audio) return

			const audioEl = document.createElement('audio')
			audioEl.autoplay = true
			audioEl.controls = false
			audioEl.style.display = 'none'

			try {
				track.attach(audioEl)
			} catch (e) {
				console.error('[voice] attach audio error:', e)
				audioEl.remove()
				return
			}

			document.body.appendChild(audioEl)

			const existing = audioElementsRef.current.get(participantSid) ?? []
			audioElementsRef.current.set(participantSid, [...existing, audioEl])
		},
		[]
	)

	const detachAudioForParticipant = useCallback(
		(participantSid: string, track?: any) => {
			const list = audioElementsRef.current.get(participantSid)
			if (!list || list.length === 0) return

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

	const enableSelfMonitor = useCallback(() => {
		if (!room) return

		const lp = room.localParticipant
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

		try {
			track.attach(audioEl)
		} catch (e) {
			console.error('[voice] self monitor attach error:', e)
			audioEl.remove()
			return
		}

		document.body.appendChild(audioEl)

		selfMonitorTrackRef.current = track
		selfMonitorAudioRef.current = audioEl
	}, [room])

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

	const attachListeners = useCallback(
		(r: Room) => {
			r.on(RoomEvent.ParticipantConnected, () => updateParticipants(r))

			r.on(RoomEvent.ParticipantDisconnected, participant => {
				detachAudioForParticipant(participant.sid)
				updateParticipants(r)
			})

			r.on(RoomEvent.ActiveSpeakersChanged, () => updateParticipants(r))

			r.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
				console.log('[voice] TrackSubscribed', {
					kind: track.kind,
					participant: participant.identity,
					sid: participant.sid,
					isLocal: participant.isLocal,
				})

				if (participant.isLocal) return

				if (track.kind === Track.Kind.Audio) {
					attachAudioForParticipant(participant.sid, track)
				}
			})

			r.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
				console.log('[voice] TrackUnsubscribed', {
					kind: track.kind,
					participant: participant.identity,
					sid: participant.sid,
				})

				if (track.kind === Track.Kind.Audio) {
					detachAudioForParticipant(participant.sid, track)
				}
			})
		},
		[attachAudioForParticipant, detachAudioForParticipant, updateParticipants]
	)

	const joinVoice = useCallback(async () => {
		if (joining || joined) return
		setError('')
		setJoining(true)

		try {
			const { token, url } = await fetchToken()

			if (!token || typeof token !== 'string') {
				throw new Error(
					'Сервер не вернул корректный токен для LiveKit (см. ответ и rawToken в консоли)'
				)
			}

			const connectUrl = url || LIVEKIT_URL

			if (!connectUrl) {
				throw new Error(
					'LiveKit URL не настроен. Задай NEXT_PUBLIC_LIVEKIT_URL или верни url из /api/voice/token'
				)
			}

			const r = new Room()
			attachListeners(r)

			await r.connect(connectUrl, token)

			await r.localParticipant.setMicrophoneEnabled(true)
			setMuted(false)

			setRoom(r)
			setJoined(true)
			updateParticipants(r)
		} catch (e: any) {
			console.error('[voice] join error:', e)
			setError(e?.message || 'Ошибка подключения к голосовому чату')
			setJoined(false)
			setRoom(null)
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

	const leaveVoice = useCallback(async () => {
		if (!room) return

		try {
			disableSelfMonitor()
			setSelfMonitor(false)

			try {
				await room.localParticipant.setMicrophoneEnabled(false)
			} catch (e) {
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
		} catch (e) {
			console.warn('[voice] error while cleaning audio elements:', e)
		}

		room.disconnect()
		setRoom(null)
		setJoined(false)
		setParticipants([])
		syncSpeakingToPlayersList([])
	}, [room, disableSelfMonitor, syncSpeakingToPlayersList])

	const toggleMute = useCallback(async () => {
		if (!room) return

		try {
			const nextMuted = !muted

			if (nextMuted) {
				disableSelfMonitor()
				setSelfMonitor(false)
			}

			await room.localParticipant.setMicrophoneEnabled(!nextMuted)
			setMuted(nextMuted)
		} catch (e) {
			console.error('[voice] toggleMute error:', e)
		}
	}, [room, muted, disableSelfMonitor])

	const toggleSelfMonitor = useCallback(async () => {
		if (!room) return

		try {
			if (selfMonitor) {
				disableSelfMonitor()
				setSelfMonitor(false)
				return
			}

			if (muted) {
				try {
					await room.localParticipant.setMicrophoneEnabled(true)
					setMuted(false)
				} catch (e) {
					console.error('[voice] failed to enable mic for self monitor:', e)
				}
			}

			enableSelfMonitor()
			setSelfMonitor(true)
		} catch (e) {
			console.error('[voice] toggleSelfMonitor error:', e)
		}
	}, [room, selfMonitor, muted, enableSelfMonitor, disableSelfMonitor])

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

			if (room) {
				try {
					room.localParticipant.setMicrophoneEnabled(false)
				} catch {}
				room.disconnect()
			}

			try {
				syncSpeakingToPlayersList([])
			} catch {}
		}
	}, [room, disableSelfMonitor, syncSpeakingToPlayersList])

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
			{/* Верх: анимация + заголовок + участники */}
			<div className={styles.headerRow}>
				<div className={styles.loader} aria-hidden='true'>
					<span className={styles.bar} />
					<span className={styles.bar} />
					<span className={styles.bar} />
				</div>
				<div className={styles.titleColumn}>
					<span className={styles.title}>Голосовой чат</span>
					<span
						className={`${styles.participantsLabel} ${
							!hasParticipants ? styles.participantsLabelEmpty : ''
						}`}
					>
						{participantsLabel}
					</span>
				</div>
			</div>

			{/* Средняя строка: статус */}
			<div className={styles.statusRow}>
				<span
					className={`${styles.statusBadge} ${
						joined
							? styles['statusBadge--connected']
							: styles['statusBadge--disconnected']
					}`}
				>
					{joined ? 'Подключен' : 'Отключен'}
				</span>
				<span className={styles.connectionStatus}>{statusText}</span>
			</div>

			{/* Низ: кнопки управления */}
			<div className={styles.buttonsRow}>
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
