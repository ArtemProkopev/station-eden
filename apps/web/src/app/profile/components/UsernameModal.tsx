'use client'

import { FormEvent, useEffect, useState } from 'react'
import styles from '../page.module.css'

interface UsernameModalProps {
	isOpen: boolean
	onClose: () => void
	currentUsername: string
	onSave: (newUsername: string) => Promise<void>
}

export const UsernameModal = ({
	isOpen,
	onClose,
	currentUsername,
	onSave,
}: UsernameModalProps) => {
	const [value, setValue] = useState(currentUsername || '')
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (isOpen) {
			setValue(currentUsername || '')
			setError(null)
			setIsSaving(false)
		}
	}, [isOpen, currentUsername])

	if (!isOpen) return null

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		setError(null)

		const trimmed = value.trim()
		if (!trimmed) {
			setError('Введите никнейм')
			return
		}

		try {
			setIsSaving(true)
			await onSave(trimmed)
			onClose()
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: 'Не удалось сохранить никнейм. Попробуйте ещё раз.'
			setError(msg)
		} finally {
			setIsSaving(false)
		}
	}

	const handleBackdropClick = () => {
		if (!isSaving) onClose()
	}

	const stop = (e: React.MouseEvent) => e.stopPropagation()

	return (
		<div className={styles.usernameModalBackdrop} onClick={handleBackdropClick}>
			<div className={styles.usernameModal} onClick={stop}>
				<h2 className={styles.usernameModalTitle}>Смена никнейма</h2>
				<p className={styles.usernameModalSubtitle}>
					Текущий ник отображается под аватаркой. Вы можете менять ник не чаще
					одного раза в 30 дней.
				</p>

				<form onSubmit={handleSubmit} className={styles.usernameModalForm}>
					<div className={styles.umInputContainer}>
						<div className={styles.umInputContent}>
							<div className={styles.umInputDist}>
								<div className={styles.umInputType}>
									<input
										className={styles.umInputField}
										type='text'
										placeholder='Введите никнейм'
										value={value}
										onChange={e => setValue(e.target.value)}
										autoFocus
									/>
								</div>
							</div>
						</div>
					</div>

					{error && <p className={styles.umError}>{error}</p>}

					<div className={styles.umActions}>
						<button
							type='button'
							className={styles.umCancelBtn}
							onClick={onClose}
							disabled={isSaving}
						>
							отмена
						</button>
						<button
							type='submit'
							className={styles.umSubmitBtn}
							disabled={isSaving}
						>
							{isSaving ? 'сохранение…' : 'сохранить'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
