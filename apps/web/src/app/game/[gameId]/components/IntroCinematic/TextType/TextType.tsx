'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './TextType.module.css'

interface TextTypeProps {
	text: string | string[]
	typingSpeed?: number
	deletingSpeed?: number
	pauseDuration?: number
	loop?: boolean
	showCursor?: boolean
	cursorCharacter?: string
	className?: string
	cursorClassName?: string
	onComplete?: () => void
}

type Phase = 'typing' | 'pausing' | 'deleting'

export default function TextType({
	text,
	typingSpeed = 75,
	deletingSpeed = 24,
	pauseDuration = 1400,
	loop = false,
	showCursor = true,
	cursorCharacter = '|',
	className = '',
	cursorClassName = '',
	onComplete,
}: TextTypeProps) {
	const texts = useMemo(() => {
		return Array.isArray(text) ? text : [text]
	}, [text])

	const [textIndex, setTextIndex] = useState(0)
	const [displayedText, setDisplayedText] = useState('')
	const [phase, setPhase] = useState<Phase>('typing')

	const completedCurrentTextRef = useRef(false)

	const currentText = texts[textIndex] ?? ''

	useEffect(() => {
		setTextIndex(0)
		setDisplayedText('')
		setPhase('typing')
		completedCurrentTextRef.current = false
	}, [texts])

	useEffect(() => {
		completedCurrentTextRef.current = false
	}, [currentText])

	useEffect(() => {
		if (phase === 'typing') {
			if (displayedText.length < currentText.length) {
				const timeout = window.setTimeout(() => {
					setDisplayedText(currentText.slice(0, displayedText.length + 1))
				}, typingSpeed)

				return () => window.clearTimeout(timeout)
			}

			const isLastText = textIndex === texts.length - 1

			if (!loop && isLastText) {
				if (!completedCurrentTextRef.current) {
					completedCurrentTextRef.current = true
					onComplete?.()
				}

				return
			}

			const timeout = window.setTimeout(() => {
				setPhase('deleting')
			}, pauseDuration)

			return () => window.clearTimeout(timeout)
		}

		if (phase === 'deleting') {
			if (displayedText.length > 0) {
				const timeout = window.setTimeout(() => {
					setDisplayedText(displayedText.slice(0, -1))
				}, deletingSpeed)

				return () => window.clearTimeout(timeout)
			}

			setTextIndex(current => (current + 1) % texts.length)
			setPhase('typing')
		}
	}, [
		currentText,
		deletingSpeed,
		displayedText,
		loop,
		onComplete,
		pauseDuration,
		phase,
		textIndex,
		texts.length,
		typingSpeed,
	])

	return (
		<div className={`${styles.textType} ${className}`}>
			<span>{displayedText}</span>

			{showCursor && (
				<span className={`${styles.cursor} ${cursorClassName}`}>
					{cursorCharacter}
				</span>
			)}
		</div>
	)
}
