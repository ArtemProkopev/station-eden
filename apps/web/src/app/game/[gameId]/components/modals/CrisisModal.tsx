// apps/web/src/app/game/[gameId]/components/modals/CrisisModal.tsx
import { CrisisInfo, ExtendedGamePlayer } from '@station-eden/shared'
import { formatTime } from '../utils/game.utils'
import styles from './GameModal.module.css'

interface CrisisModalProps {
	crisis: CrisisInfo
	phaseTimeLeft: number
	currentPlayer?: ExtendedGamePlayer
	isConnected: boolean
	onSolve: () => void
	onClose: () => void
}

const PROFESSION_NAMES: Record<string, string> = {
	prof_engineer: 'Инженер',
	prof_astrobiologist: 'Астробиолог',
	prof_pilot: 'Пилот',
	prof_surgeon: 'Хирург',
	prof_linguist: 'Лингвист',
	prof_security: 'Офицер безопасности',
	prof_communications: 'Специалист связи',
	prof_geologist: 'Геолог',
	prof_psychologist: 'Психолог',
	prof_medic: 'Медик',
	prof_doctor: 'Врач',
	prof_biologist: 'Биолог',
}

const PROFESSION_IDS_BY_NAME: Record<string, string> = Object.entries(
	PROFESSION_NAMES,
).reduce(
	(acc, [id, name]) => {
		acc[name.toLowerCase()] = id
		return acc
	},
	{} as Record<string, string>,
)

export default function CrisisModal({
	crisis,
	phaseTimeLeft,
	currentPlayer,
	isConnected,
	onSolve,
	onClose,
}: CrisisModalProps) {
	const currentProfessionId = normalizeProfessionId(currentPlayer?.profession)
	const canSolveCrisis =
		Boolean(currentProfessionId) &&
		Boolean(crisis?.priorityProfessions?.includes(currentProfessionId))

	const requiredProfessions =
		crisis?.priorityProfessions
			?.map(profession => getProfessionName(profession))
			.join(', ') || 'Любой игрок'

	const currentProfessionDisplay = currentPlayer?.profession
		? getProfessionName(currentPlayer.profession)
		: 'Неизвестно'

	return (
		<div className={styles.modalOverlay}>
			<section className={styles.modalContent} role='dialog' aria-modal='true'>
				<div className={styles.modalHeader}>
					<div>
						<span className={styles.modalEyebrow}>
							{getCrisisTypeName(crisis)}
						</span>
						<h2>{cleanText(crisis?.name || 'Кризис')}</h2>
						{crisis?.description && <p>{cleanText(crisis.description)}</p>}
					</div>

					<button
						type='button'
						className={styles.closeButton}
						onClick={onClose}
						aria-label='Закрыть кризис'
					>
						✕
					</button>
				</div>

				<div className={styles.modalBody}>
					<div className={styles.infoGrid}>
						<InfoBlock
							title='Необходимое действие'
							value={getCrisisHelp(crisis)}
						/>
						<InfoBlock title='Кто может решить' value={requiredProfessions} />
						<InfoBlock
							title='Ваша профессия'
							value={currentProfessionDisplay}
						/>
						<InfoBlock
							title='Время на решение'
							value={formatTime(phaseTimeLeft)}
						/>
						{crisis?.penalty && (
							<InfoBlock title='Штраф' value={crisis.penalty} danger />
						)}
					</div>

					{!canSolveCrisis && (
						<div className={styles.statusPanel}>
							<p>Ваша профессия не подходит для решения этого кризиса</p>
							<p>Нужен специалист: {requiredProfessions}</p>
						</div>
					)}
				</div>

				<div className={styles.modalActions}>
					{canSolveCrisis && (
						<button
							type='button'
							className={styles.primaryButton}
							onClick={onSolve}
							disabled={!isConnected}
						>
							Решить кризис
						</button>
					)}

					<button
						type='button'
						className={styles.secondaryButton}
						onClick={onClose}
					>
						Закрыть
					</button>
				</div>
			</section>
		</div>
	)
}

function InfoBlock({
	title,
	value,
	danger = false,
}: {
	title: string
	value: string
	danger?: boolean
}) {
	return (
		<div
			className={`${styles.infoBlock} ${danger ? styles.infoBlockDanger : ''}`}
		>
			<strong>{title}</strong>
			<p>{cleanText(value)}</p>
		</div>
	)
}

function getCrisisHelp(crisis: CrisisInfo): string {
	switch (crisis?.type) {
		case 'technological':
			return 'Требуется инженер для ремонта систем станции'

		case 'biological':
			return 'Требуется медик или биолог для лечения экипажа'

		case 'external':
			return 'Требуется специалист по связи или пилот для навигации'

		default:
			return 'Требуется специалист с подходящей профессией'
	}
}

function getCrisisTypeName(crisis: CrisisInfo): string {
	switch (crisis?.type) {
		case 'technological':
			return 'Технологический кризис'

		case 'biological':
			return 'Биологический кризис'

		case 'external':
			return 'Внешняя угроза'

		default:
			return 'Кризис станции'
	}
}

function normalizeProfessionId(profession?: string): string {
	if (!profession) return ''

	if (PROFESSION_NAMES[profession]) {
		return profession
	}

	return PROFESSION_IDS_BY_NAME[profession.toLowerCase()] || profession
}

function getProfessionName(profession: string): string {
	return PROFESSION_NAMES[profession] || profession
}

function cleanText(value: string): string {
	return value
		.trim()
		.replace(/\bprof_[a-z_]+\b/g, match => PROFESSION_NAMES[match] || match)
		.replace(/[.!?。！？]+$/g, '')
}
