import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
} from 'typeorm'

@Entity('login_attempts')
@Index(['login', 'attemptTime'])
export class LoginAttempt {
	@PrimaryGeneratedColumn('uuid')
	id!: string

	/** Нормализованный логин (email или username, lowercased) */
	@Column({ type: 'text' })
	login!: string

	@CreateDateColumn({ name: 'attempt_time', type: 'timestamptz' })
	attemptTime!: Date

	@Column({ type: 'boolean', default: false })
	success!: boolean

	/** Если задано — до этого времени логин заблокирован */
	@Column({ name: 'blocked_until', type: 'timestamptz', nullable: true })
	blockedUntil?: Date | null
}
