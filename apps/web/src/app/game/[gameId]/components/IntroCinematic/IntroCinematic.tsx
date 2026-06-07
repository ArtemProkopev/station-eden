'use client'

import { formatPlayersGenitiveCount } from '@/lib/ruPlural'
import dynamic from 'next/dynamic'
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import styles from './IntroCinematic.module.css'
import TextType from './TextType/TextType'

interface IntroCinematicProps {
	playersCount: number
	phaseTimeLeft: number
	canSkip: boolean
	skipProgress?: {
		skippedCount: number
		playersCount: number
	}
	onSkip: () => void
	onComplete?: () => void
}

interface IntroScene {
	title: string
	text: string
}

const Galaxy = dynamic(() => import('./Galaxy/Galaxy'), {
	ssr: false,
})

const INTRO_PHASE_DURATION_SECONDS = 45
const TIMER_TICK_MS = 250
const DEADLINE_SYNC_TOLERANCE_MS = 900
const DEFAULT_TYPING_SPEED_MS = 58
const MIN_TYPING_SPEED_MS = 10
const SCENE_HOLD_MS = 920
const FAST_SCENE_HOLD_MS = 120
const DEADLINE_COMPLETE_DELAY_MS = 80

const GALAXY_FOCAL: [number, number] = [0.5, 0.48]
const GALAXY_ROTATION: [number, number] = [1.0, 0.035]

function formatCapsuleSlotsCount(value: number) {
	const safeValue = Math.max(1, Math.floor(value))
	const mod10 = safeValue % 10
	const mod100 = safeValue % 100

	if (safeValue === 1) return 'одно место'
	if (mod100 >= 11 && mod100 <= 14) return `${safeValue} мест`
	if (mod10 >= 2 && mod10 <= 4) return `${safeValue} места`

	return `${safeValue} мест`
}

function createIntroScenes(playersCount: number): IntroScene[] {
	const capsuleSlots = Math.max(1, Math.floor(playersCount / 2))
	const capsuleSlotsText = formatCapsuleSlotsCount(capsuleSlots)

	return [
		{
			title: '2247: ОРБИТА ХЕЛИОСА',
			text: 'Станция «Эдем» удерживается на орбите Хелиоса — планеты, которую считали шансом для человечества.',
		},
		{
			title: 'КОНТАКТ ПОТЕРЯН',
			text: 'После атаки неизвестных сил внешний контур пробит. Связь оборвана, часть отсеков заблокирована, кислород уходит быстрее расчётов.',
		},
		{
			title: 'КАПСУЛА «НАДЕЖДА»',
			text: `В аварийном ангаре осталась капсула «Надежда». В ней всего ${capsuleSlotsText}. Второго запуска не будет.`,
		},
		{
			title: 'ВЫЖИВУТ НЕ ВСЕ',
			text: 'Экипаж должен решить, кто получит шанс на спасение. Но страх, ложь и саботаж уже стали частью этой станции.',
		},
	]
}

function formatSecondsWord(value: number) {
	const mod10 = value % 10
	const mod100 = value % 100

	if (mod100 >= 11 && mod100 <= 14) return 'секунд'
	if (mod10 === 1) return 'секунда'
	if (mod10 >= 2 && mod10 <= 4) return 'секунды'

	return 'секунд'
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max)
}

function createDeadline(secondsLeft: number) {
	return Date.now() + Math.max(0, secondsLeft) * 1000
}

function getSecondsUntil(deadline: number) {
	return Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
}

function getRemainingScenesTextLength(
	scenes: IntroScene[],
	sceneIndex: number,
) {
	return scenes
		.slice(sceneIndex)
		.reduce((total, scene) => total + scene.text.length, 0)
}

export default function IntroCinematic({
	playersCount,
	phaseTimeLeft,
	canSkip,
	skipProgress,
	onSkip,
	onComplete,
}: IntroCinematicProps) {
	const deadlineRef = useRef<number | null>(null)

	if (deadlineRef.current === null) {
		deadlineRef.current = createDeadline(phaseTimeLeft)
	}

	const [isFinished, setIsFinished] = useState(false)
	const [hasRequestedSkip, setHasRequestedSkip] = useState(false)
	const [sceneIndex, setSceneIndex] = useState(0)
	const [remainingTimeLeft, setRemainingTimeLeft] = useState(() =>
		getSecondsUntil(deadlineRef.current ?? Date.now()),
	)

	const introScenes = useMemo(
		() => createIntroScenes(playersCount),
		[playersCount],
	)

	const sceneTimeoutRef = useRef<number | null>(null)
	const completionTimeoutRef = useRef<number | null>(null)
	const skipCalledRef = useRef(false)
	const completeCalledRef = useRef(false)

	const scene = introScenes[sceneIndex]
	const isDeadlineExpired = remainingTimeLeft <= 0

	const clearSceneTimeout = useCallback(() => {
		if (sceneTimeoutRef.current === null) return

		window.clearTimeout(sceneTimeoutRef.current)
		sceneTimeoutRef.current = null
	}, [])

	const clearCompletionTimeout = useCallback(() => {
		if (completionTimeoutRef.current === null) return

		window.clearTimeout(completionTimeoutRef.current)
		completionTimeoutRef.current = null
	}, [])

	const requestCompleteOnce = useCallback(
		(delayMs = 0) => {
			if (skipCalledRef.current || completeCalledRef.current) return

			completeCalledRef.current = true
			clearSceneTimeout()
			clearCompletionTimeout()
			setIsFinished(true)

			if (delayMs > 0) {
				completionTimeoutRef.current = window.setTimeout(() => {
					completionTimeoutRef.current = null
					onComplete?.()
				}, delayMs)
				return
			}

			onComplete?.()
		},
		[clearCompletionTimeout, clearSceneTimeout, onComplete],
	)

	const handleSkip = useCallback(() => {
		if (!canSkip || skipCalledRef.current || completeCalledRef.current) return

		skipCalledRef.current = true
		clearSceneTimeout()
		clearCompletionTimeout()
		setSceneIndex(introScenes.length - 1)
		setHasRequestedSkip(true)
		setIsFinished(true)
		onSkip()
	}, [
		canSkip,
		clearCompletionTimeout,
		clearSceneTimeout,
		introScenes.length,
		onSkip,
	])

	const handleSceneComplete = useCallback(() => {
		if (skipCalledRef.current || completeCalledRef.current) return

		clearSceneTimeout()

		const holdMs = remainingTimeLeft <= 3 ? FAST_SCENE_HOLD_MS : SCENE_HOLD_MS

		sceneTimeoutRef.current = window.setTimeout(() => {
			if (sceneIndex >= introScenes.length - 1) {
				requestCompleteOnce()
				return
			}

			setSceneIndex(current => Math.min(current + 1, introScenes.length - 1))
		}, holdMs)
	}, [
		clearSceneTimeout,
		introScenes.length,
		remainingTimeLeft,
		requestCompleteOnce,
		sceneIndex,
	])

	useEffect(() => {
		const nextDeadline = createDeadline(phaseTimeLeft)
		const currentDeadline = deadlineRef.current ?? nextDeadline
		const shouldSyncDeadline =
			phaseTimeLeft <= 0 ||
			Math.abs(nextDeadline - currentDeadline) > DEADLINE_SYNC_TOLERANCE_MS

		if (shouldSyncDeadline) {
			deadlineRef.current = nextDeadline
		}

		setRemainingTimeLeft(getSecondsUntil(deadlineRef.current ?? nextDeadline))
	}, [phaseTimeLeft])

	useEffect(() => {
		const updateRemainingTime = () => {
			const nextValue = getSecondsUntil(deadlineRef.current ?? Date.now())
			setRemainingTimeLeft(current =>
				current === nextValue ? current : nextValue,
			)
		}

		updateRemainingTime()

		const interval = window.setInterval(updateRemainingTime, TIMER_TICK_MS)
		return () => window.clearInterval(interval)
	}, [])

	useEffect(() => {
		if (!canSkip || isFinished) return

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Enter' || event.repeat) return

			event.preventDefault()
			handleSkip()
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [canSkip, handleSkip, isFinished])

	useEffect(() => {
		if (!isDeadlineExpired || hasRequestedSkip) return

		setSceneIndex(introScenes.length - 1)
		requestCompleteOnce(DEADLINE_COMPLETE_DELAY_MS)
	}, [
		hasRequestedSkip,
		introScenes.length,
		isDeadlineExpired,
		requestCompleteOnce,
	])

	useEffect(() => {
		return () => {
			clearSceneTimeout()
			clearCompletionTimeout()
		}
	}, [clearCompletionTimeout, clearSceneTimeout])

	const crewText = useMemo(() => {
		return `Экипаж сформирован из ${formatPlayersGenitiveCount(playersCount)}`
	}, [playersCount])

	const secondsLabel = formatSecondsWord(remainingTimeLeft)
	const timerProgress = clamp(
		remainingTimeLeft / INTRO_PHASE_DURATION_SECONDS,
		0,
		1,
	)
	const timerAngle = `${Math.round(timerProgress * 360)}deg`

	const timerRingStyle = {
		'--timer-angle': timerAngle,
	} as CSSProperties & Record<'--timer-angle', string>

	const activeSceneHoldMs =
		remainingTimeLeft <= 3 ? FAST_SCENE_HOLD_MS : SCENE_HOLD_MS
	const remainingTextLength = getRemainingScenesTextLength(
		introScenes,
		sceneIndex,
	)
	const remainingHoldsCount = Math.max(0, introScenes.length - sceneIndex - 1)
	const remainingTypingBudgetMs =
		remainingTimeLeft * 1000 - remainingHoldsCount * activeSceneHoldMs - 450

	const typingSpeed = clamp(
		Math.floor(remainingTypingBudgetMs / Math.max(1, remainingTextLength)),
		MIN_TYPING_SPEED_MS,
		DEFAULT_TYPING_SPEED_MS,
	)

	const skipProgressPlayersCount = skipProgress?.playersCount || playersCount
	const skipProgressSkippedCount = Math.min(
		skipProgressPlayersCount,
		Math.max(skipProgress?.skippedCount || 0, hasRequestedSkip ? 1 : 0),
	)

	const shouldShowSkipProgress =
		skipProgressPlayersCount > 1 && skipProgressSkippedCount > 0

	const statusText = hasRequestedSkip
		? 'Ожидаем остальных членов экипажа'
		: isFinished
			? 'Переход к игре'
			: 'Воспроизведение протокола'

	return (
		<section
			className={styles.cinematic}
			aria-label='Заставка предыстории Station Eden'
		>
			<div className={styles.galaxyLayer} aria-hidden='true'>
				<Galaxy
					mouseInteraction
					mouseRepulsion
					transparent={false}
					density={1.38}
					glowIntensity={0.9}
					saturation={0.46}
					hueShift={218}
					starSpeed={0.32}
					speed={0.72}
					twinkleIntensity={0.45}
					rotationSpeed={0.035}
					repulsionStrength={1.15}
					starScale={1.14}
					flareIntensity={0.72}
					focal={GALAXY_FOCAL}
					rotation={GALAXY_ROTATION}
				/>
			</div>

			<div className={styles.panel}>
				<header className={styles.header}>
					<span>Станция «Эдем»</span>
					<span>Аварийная трансляция</span>
				</header>

				<main className={styles.content}>
					<p className={styles.crew}>{crewText}</p>

					<h1 key={scene.title}>{scene.title}</h1>

					{isFinished ? (
						<p className={styles.staticText}>{scene.text}</p>
					) : (
						<TextType
							key={scene.text}
							text={scene.text}
							typingSpeed={typingSpeed}
							className={styles.textType}
							cursorClassName={styles.textCursor}
							onComplete={handleSceneComplete}
						/>
					)}
				</main>

				<footer className={styles.footer}>
					<div className={styles.statusBlock}>
						<div className={styles.statusLine}>
							<span className={styles.statusDot} />
							<span className={styles.statusText}>{statusText}</span>
							<span className={styles.statusDots} aria-hidden='true' />
						</div>

						{shouldShowSkipProgress && (
							<p className={styles.skipProgress}>
								Пропуск: {skipProgressSkippedCount} из{' '}
								{skipProgressPlayersCount}
							</p>
						)}

						{canSkip && !isFinished && (
							<button
								type='button'
								className={styles.skipHint}
								onClick={handleSkip}
								aria-label='Пропустить предысторию'
							>
								<span className={styles.desktopSkipText}>Нажмите</span>
								<kbd>Enter</kbd>
								<span className={styles.desktopSkipText}>чтобы пропустить</span>
								<span className={styles.touchSkipText}>
									Пропустить предысторию
								</span>
							</button>
						)}
					</div>

					<div className={styles.timerOrb} aria-label='Таймер фазы'>
						<div className={styles.timerRing} style={timerRingStyle}>
							<div className={styles.timerInner}>
								<strong>{remainingTimeLeft}</strong>
								<span>сек</span>
							</div>
						</div>

						<p className={styles.timerCaption}>
							{remainingTimeLeft > 0 ? 'До старта' : 'Переход'}
						</p>

						<span className={styles.timerHiddenLabel}>
							{remainingTimeLeft} {secondsLabel}
						</span>
					</div>
				</footer>
			</div>
		</section>
	)
}
