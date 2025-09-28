// apps/api/src/auth/oauth-account.entity.ts
import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	Unique,
} from 'typeorm'
import { User } from '../users/user.entity'

export type OAuthProvider = 'google'

@Entity('oauth_accounts')
@Unique('uq_provider_sub', ['provider', 'providerUserId'])
export class OAuthAccount {
	@PrimaryGeneratedColumn('uuid')
	id!: string

	@Column({ type: 'text' })
	provider!: OAuthProvider

	@Index()
	@Column({ name: 'provider_user_id', type: 'text' })
	providerUserId!: string // Google sub

	@Index()
	@Column({ type: 'citext' })
	email!: string

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user!: User

	@Index()
	@Column({ name: 'user_id', type: 'uuid' })
	userId!: string

	@CreateDateColumn({ name: 'created_at' })
	createdAt!: Date
}
