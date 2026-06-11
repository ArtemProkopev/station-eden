'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './LobbyHeader.module.css'

interface LobbyHeaderProps {
	title: string
	lobbyId: string
	isConnected: boolean
	showInviteLink?: boolean
}

export default function LobbyHeader({
	title,
	lobbyId,
	isConnected,
	showInviteLink = false,
}: LobbyHeaderProps) {
	const [copied, setCopied] = useState(false)
	const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		return () => {
			if (copiedTimerRef.current) {
				clearTimeout(copiedTimerRef.current)
			}
		}
	}, [])

	const copyWithFallback = async (text: string) => {
		if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
			try {
				await navigator.clipboard.writeText(text)
				return
			} catch {
			}
		}

		if (typeof document === 'undefined') {
			throw new Error('Document is not available')
		}

		const textarea = document.createElement('textarea')
		textarea.value = text
		textarea.setAttribute('readonly', '')
		textarea.style.position = 'fixed'
		textarea.style.left = '-9999px'
		textarea.style.top = '0'
		textarea.style.opacity = '0'

		document.body.appendChild(textarea)
		textarea.focus()
		textarea.select()

		const isCopied = document.execCommand('copy')
		document.body.removeChild(textarea)

		if (!isCopied) {
			throw new Error('Copy command failed')
		}
	}

	const handleCopyLobbyLink = async () => {
		if (typeof window === 'undefined') return

		const lobbyUrl = `${window.location.origin}/lobby/${lobbyId}`

		try {
			await copyWithFallback(lobbyUrl)
			setCopied(true)

			if (copiedTimerRef.current) {
				clearTimeout(copiedTimerRef.current)
			}

			copiedTimerRef.current = setTimeout(() => {
				setCopied(false)
			}, 1600)
		} catch {
			setCopied(false)
		}
	}

	return (
		<>
			{copied && (
				<div
					className={styles.copyToast}
					role='status'
					aria-live='polite'
					aria-atomic='true'
				>
					<svg
						className={styles.copyToastIcon}
						width='18'
						height='18'
						viewBox='0 0 24 24'
						fill='none'
						aria-hidden='true'
					>
						<path
							d='M20 6L9 17L4 12'
							stroke='currentColor'
							strokeWidth='2.4'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					</svg>

					<span>Ссылка на лобби скопирована в буфер обмена</span>
				</div>
			)}

			<div className={styles.header}>
				<h1 className={styles.title}>{title}</h1>

				<div className={styles.headerInfo}>
					<div className={styles.headerMeta}>
						<div className={styles.lobbyIdPill}>
							<span className={styles.lobbyIdText}>ID: {lobbyId}</span>

							{showInviteLink && (
								<>
									<span className={styles.lobbyIdDivider} aria-hidden='true' />

									<button
										type='button'
										className={`${styles.copyLinkButton} ${
											copied ? styles.copied : ''
										}`}
										onClick={handleCopyLobbyLink}
										aria-label='Скопировать ссылку на лобби'
									>
										<svg
											className={styles.copyLinkIcon}
											width='22'
											height='22'
											viewBox='0 0 24 24'
											fill='none'
											aria-hidden='true'
										>
											<path
												className={styles.copyLinkChain}
												d='M9.4 14.6L14.6 9.4'
												stroke='currentColor'
												strokeWidth='2'
												strokeLinecap='round'
											/>

											<path
												className={styles.copyLinkChain}
												d='M8.2 17.2L7.5 17.9C6.05 19.35 3.7 19.35 2.25 17.9C0.8 16.45 0.8 14.1 2.25 12.65L5.65 9.25C7.1 7.8 9.45 7.8 10.9 9.25'
												stroke='currentColor'
												strokeWidth='2'
												strokeLinecap='round'
												strokeLinejoin='round'
											/>

											<path
												className={styles.copyLinkChain}
												d='M15.8 6.8L16.5 6.1C17.95 4.65 20.3 4.65 21.75 6.1C23.2 7.55 23.2 9.9 21.75 11.35L18.35 14.75C16.9 16.2 14.55 16.2 13.1 14.75'
												stroke='currentColor'
												strokeWidth='2'
												strokeLinecap='round'
												strokeLinejoin='round'
											/>
										</svg>
									</button>
								</>
							)}
						</div>

						<div
							className={`${styles.connectionStatus} ${
								isConnected ? styles.connected : styles.disconnected
							}`}
						>
							{isConnected ? 'Подключено' : 'Не подключено'}
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
