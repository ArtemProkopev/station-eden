'use client'

import { useRef, useState } from 'react'
import styles from './page.module.css'

export default function CopyButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false)
	const btnRef = useRef<HTMLButtonElement | null>(null)

	async function copy() {
		try {
			await navigator.clipboard.writeText(value)
			setCopied(true)

			const btn = btnRef.current
			if (btn) {
				btn.classList.remove(styles.spark)
				void btn.getBoundingClientRect()
				btn.classList.add(styles.spark)
				const onEnd = () => btn.classList.remove(styles.spark)
				btn.addEventListener('animationend', onEnd, { once: true })
			}

			setTimeout(() => setCopied(false), 1100)
		} catch {}
	}

	return (
		<>
			<button
				ref={btnRef}
				type='button'
				onClick={copy}
				className={styles.copyBtn}
				aria-live='polite'
				aria-label={copied ? 'Скопировано' : 'Скопировать ID'}
			>
				{copied ? 'СКОПИРОВАНО!' : 'КОПИРОВАТЬ'}
				<span className={styles.sp1} aria-hidden />
				<span className={styles.sp2} aria-hidden />
				<span className={styles.sp3} aria-hidden />
			</button>
			{/* скрытый статус для screen reader */}
			<span className='sr-only' aria-live='polite'>
				{copied ? 'ID скопирован в буфер обмена' : ''}
			</span>
		</>
	)
}
