import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from '../users/user.entity'

@Entity('refresh_tokens')
export class RefreshToken {
	@PrimaryGeneratedColumn('uuid')
	id!: string

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user!: User

	@Index()
	@Column({ name: 'user_id', type: 'uuid' })
	userId!: string

	/**
	 * Небольшой префикс refresh token (например, первые 16 символов),
	 * чтобы быстро отобрать кандидатов без перебора bcrypt по сотням строк.
	 */
	@Index()
	@Column({ type: 'text', default: '' })
	selector!: string

	/**
	 * bcrypt hash refresh token'а
	 * НЕ unique: соль делает значение уникальным почти всегда,
	 * а unique-index по text только тормозит.
	 */
	@Index()
	@Column({ name: 'token_hash', type: 'text' })
	tokenHash!: string

	@Index()
	@Column({ name: 'expires_at', type: 'timestamptz' })
	expiresAt!: Date

	@Index()
	@Column({ default: false })
	revoked!: boolean

	@CreateDateColumn({ name: 'created_at' })
	createdAt!: Date
}
