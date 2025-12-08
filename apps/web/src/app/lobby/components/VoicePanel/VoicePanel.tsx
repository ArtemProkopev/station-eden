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
	const [joining, setJoining] = useState(false)
	const [joined, setJoined] = useState(false)
	const [muted, setMuted] = useState(false)
	const [selfMonitor, setSelfMonitor] = useState(false)
	const [participants, setParticipants] = useState<UiParticipant[]>([])
	const [error, setError] = useState<string>('')
	const [audioBlocked, setAudioBlocked] = useState(false)
	const [showAudioUnlockBanner, setShowAudioUnlockBanner] = useState(false)

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
			})

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

	// отдаём статистику наверх (для таба "голосовой чат")
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
				track.attach(audioEl)

				const playResult = audioEl.play()
				if (playResult && typeof (playResult as any).catch === 'function') {
					;(playResult as Promise<void>).catch((err: unknown) => {
						console.warn('[voice] audioEl.play blocked:', err)
						// если браузер заблокировал воспроизведение — покажем кнопку/баннер
						setAudioBlocked(true)
						setShowAudioUnlockBanner(true)
					})
				}
			} catch (e) {
				console.error('[voice] attach audio error:', e)
				audioEl.remove()
				return
			}

			document.body.appendChild(audioEl)

			const existing = audioElementsRef.current.get(participantSid) ?? []
			audioElementsRef.current.set(participantSid, [...existing, audioEl])

			console.log(`[voice] Audio attached successfully for ${participantSid}`)
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
				// список говорящих меняется — обновляем флажок isSpeaking
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

			// autoplay-политика: LiveKit рекомендует слушать это событие
			r.on(RoomEvent.AudioPlaybackStatusChanged, () => {
				const blocked = !r.canPlaybackAudio
				setAudioBlocked(blocked)
				setShowAudioUnlockBanner(blocked)
				console.log(
					'[voice] AudioPlaybackStatusChanged, canPlaybackAudio=',
					r.canPlaybackAudio
				)
			})

			r.on(RoomEvent.Disconnected, () => {
				console.log('[voice] Room disconnected')
				setJoined(false)
				setMuted(false)
				setParticipants([])
				setAudioBlocked(false)
				setShowAudioUnlockBanner(false)
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

	// --- общий хендлер "разблокировать звук" ---
	const handleUnlockAudio = useCallback(async () => {
		if (!room) return

		try {
			await room.startAudio()
			console.log(
				'[voice] manual startAudio, canPlaybackAudio =',
				room.canPlaybackAudio
			)

			// пробуем ещё раз проиграть все audio-элементы
			audioElementsRef.current.forEach(els => {
				els.forEach(el => {
					try {
						const p = el.play()
						if (p && typeof (p as any).catch === 'function') {
							;(p as Promise<void>).catch(err => {
								console.warn('[voice] manual audioEl.play blocked:', err)
							})
						}
					} catch (err) {
						console.warn('[voice] manual audioEl.play error:', err)
					}
				})
			})

			const blockedNow = !room.canPlaybackAudio
			setAudioBlocked(blockedNow)
			setShowAudioUnlockBanner(blockedNow)
		} catch (err) {
			console.warn('[voice] manual startAudio failed:', err)
			setAudioBlocked(true)
			setShowAudioUnlockBanner(true)
		}
	}, [room])

	// --- Подключение к голосовому чату ---
	const joinVoice = useCallback(async () => {
		if (joining || joined) return

		setError('')
		setJoining(true)
		setAudioBlocked(false)
		setShowAudioUnlockBanner(false)

		// перед подключением очищаем предыдущие audio-элементы
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

			// основной коннект
			await newRoom.connect(connectUrl, token, {
				autoSubscribe: true,
			})

			console.log(
				'[voice] Connected to room, local participant:',
				newRoom.localParticipant.identity
			)

			setRoom(newRoom)
			setJoined(true)
			updateParticipants(newRoom)

			// стартуем аудио (внутри onClick кнопки connect → это уже user gesture)
			try {
				await newRoom.startAudio()
				const blocked = !newRoom.canPlaybackAudio
				setAudioBlocked(blocked)
				setShowAudioUnlockBanner(blocked)
				console.log(
					'[voice] Audio started, canPlaybackAudio =',
					newRoom.canPlaybackAudio
				)
			} catch (e: unknown) {
				console.warn('[voice] startAudio blocked:', e)
				setAudioBlocked(true)
				setShowAudioUnlockBanner(true)
			}

			// включаем микрофон, чтобы нас слышали другие
			try {
				await newRoom.localParticipant.setMicrophoneEnabled(true)
				setMuted(false)
				console.log('[voice] Microphone enabled')
			} catch (e: unknown) {
				console.error('[voice] failed to enable microphone:', e)
				setMuted(true)
			}
		} catch (e: any) {
			console.error('[voice] join error:', e)
			setError(e?.message || 'Ошибка подключения к голосовому чату')
			setJoined(false)
			setRoom(null)
			setParticipants([])
			setAudioBlocked(false)
			setShowAudioUnlockBanner(false)
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
		if (!room) return

		console.log('[voice] Leaving voice chat')

		try {
			disableSelfMonitor()
			setSelfMonitor(false)

			try {
				await room.localParticipant.setMicrophoneEnabled(false)
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
			room.disconnect()
		} catch (e) {
			console.warn('[voice] error while disconnecting room:', e)
		}

		setRoom(null)
		setJoined(false)
		setMuted(false)
		setParticipants([])
		setAudioBlocked(false)
		setShowAudioUnlockBanner(false)
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
			console.log(`[voice] Microphone ${nextMuted ? 'muted' : 'unmuted'}`)
		} catch (e: unknown) {
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
				} catch (e: unknown) {
					console.error('[voice] failed to enable mic for self monitor:', e)
				}
			}

			enableSelfMonitor()
			setSelfMonitor(true)
		} catch (e: unknown) {
			console.error('[voice] toggleSelfMonitor error:', e)
		}
	}, [room, selfMonitor, muted, enableSelfMonitor, disableSelfMonitor])

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

			if (room) {
				try {
					room.localParticipant.setMicrophoneEnabled(false)
				} catch {}
				try {
					room.disconnect()
				} catch {}
			}

			try {
				syncSpeakingToPlayersList([])
			} catch {}

			setAudioBlocked(false)
			setShowAudioUnlockBanner(false)
		}
	}, [room, disableSelfMonitor, syncSpeakingToPlayersList])

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
			{showAudioUnlockBanner && (
				<div className={styles.audioBanner}>
					<div className={styles.audioBannerContent}>
						<span className={styles.audioBannerTitle}>
							Браузер заблокировал звук
						</span>
						<span className={styles.audioBannerText}>
							Нажмите «Включить звук», чтобы разрешить воспроизведение аудио для
							голосового чата.
						</span>
					</div>
					<button
						type='button'
						className={styles.audioBannerButton}
						onClick={handleUnlockAudio}
					>
						Включить звук
					</button>
				</div>
			)}

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
								onClick={handleUnlockAudio}
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
