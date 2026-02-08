'use client'

import React, {
	forwardRef,
	useCallback,
	useEffect,
	useId,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react'
import styles from './OTPInput.module.css'

type OTPInputProps = {
	length?: number
	value?: string
	onChange?: (value: string) => void
	onComplete?: (value: string) => void
	disabled?: boolean
	autoFocus?: boolean
	name?: string
	id?: string
	className?: string
	error?: boolean
	ariaLabel?: string
}

type OTPInputHandle = {
	focus: () => void
	blur: () => void
	clear: () => void
}

function digitsOnly(s: string) {
	return (s || '').replace(/\D/g, '')
}
function clampDigits(s: string, len: number) {
	return digitsOnly(s).slice(0, len)
}

const OTPInput = forwardRef<OTPInputHandle, OTPInputProps>(function OTPInput(
	{
		length = 6,
		value,
		onChange,
		onComplete,
		disabled,
		autoFocus,
		name,
		id,
		className,
		error,
		ariaLabel = 'Код подтверждения',
	},
	ref
) {
	const rid = useId()
	const inputId = id || `otp-${rid}`

	const [internal, setInternal] = useState<string>(
		clampDigits(value ?? '', length)
	)
	const val = value !== undefined ? clampDigits(value, length) : internal

	const containerRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const [isFocused, setIsFocused] = useState(false)

	useImperativeHandle(
		ref,
		() => ({
			focus: () => inputRef.current?.focus(),
			blur: () => inputRef.current?.blur(),
			clear: () => {
				setValue('')
				inputRef.current?.focus()
			},
		}),
		[]
	)

	const setValue = useCallback(
		(next: string) => {
			const digits = clampDigits(next, length)
			if (value === undefined) setInternal(digits)
			onChange?.(digits)
			if (digits.length === length) onComplete?.(digits)
		},
		[length, onChange, onComplete, value]
	)

	useEffect(() => {
		if (autoFocus) inputRef.current?.focus()
	}, [autoFocus])

	const onKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (disabled) return

			if (e.key === 'Backspace') {
				if (!val) return
				setValue(val.slice(0, -1))
				e.preventDefault()
				return
			}
			if (e.key === 'Enter') {
				if (val.length === length) onComplete?.(val)
				return
			}
			if (/^\d$/.test(e.key)) {
				setValue(val + e.key)
				e.preventDefault()
			}
		},
		[disabled, length, onComplete, setValue, val]
	)

	const onInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (disabled) return
			setValue(e.target.value)
		},
		[disabled, setValue]
	)

	const onPasteAny = useCallback(
		(e: React.ClipboardEvent<HTMLDivElement | HTMLInputElement>) => {
			if (disabled) return
			const text = e.clipboardData.getData('text')
			if (text) {
				e.preventDefault()
				setValue(text)
			}
		},
		[disabled, setValue]
	)

	const digitsArray = useMemo(() => {
		const arr = new Array(length).fill('')
		for (let i = 0; i < length; i++) arr[i] = val[i] ?? ''
		return arr
	}, [length, val])

	const activeIndex = Math.min(val.length, length - 1)

	return (
		<div
			ref={containerRef}
			className={[styles.root, className].filter(Boolean).join(' ')}
			data-disabled={disabled ? '' : undefined}
			data-error={error ? '' : undefined}
			data-focused={isFocused ? '' : undefined}
			onClick={() => !disabled && inputRef.current?.focus()}
			onPaste={onPasteAny}
			role='group'
			aria-label={ariaLabel}
			style={{ ['--len' as any]: String(length) } as React.CSSProperties}
		>
			<input
				ref={inputRef}
				id={inputId}
				name={name}
				inputMode='numeric'
				pattern='[0-9]*'
				autoComplete='one-time-code'
				className={styles.hiddenInput}
				value={val}
				onChange={onInputChange}
				onKeyDown={onKeyDown}
				onFocus={() => setIsFocused(true)}
				onBlur={() => setIsFocused(false)}
				disabled={!!disabled}
				aria-label={ariaLabel}
			/>

			<div className={styles.liquid} aria-hidden />

			{/* Горизонтальный ряд слотов */}
			<div className={styles.track}>
				{digitsArray.map((d, i) => {
					const isActive = i === activeIndex && val.length < length
					const filled = d !== ''
					return (
						<div
							key={i}
							className={styles.slot}
							data-active={isActive ? '' : undefined}
							data-filled={filled ? '' : undefined}
							aria-hidden
						>
							<span className={styles.char}>{d}</span>
							{isActive && <span className={styles.caret} />}
						</div>
					)
				})}
			</div>
		</div>
	)
})

export default OTPInput
