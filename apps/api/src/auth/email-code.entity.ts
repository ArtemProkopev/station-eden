// apps/api/src/auth/email-code.entity.ts
import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
} from 'typeorm'

@Entity('email_codes')
export class EmailCode {
	@PrimaryGeneratedColumn('uuid')
	id!: string

	@Index()
	@Column({ name: 'user_id', type: 'uuid' })
	userId!: string

	@Index()
	@Column({ type: 'citext' })
	email!: string

	@Column({ type: 'varchar', length: 6 })
	code!: string

	@Index()
	@Column({ name: 'expires_at', type: 'timestamptz' })
	expiresAt!: Date

	@Index()
	@Column({ default: false })
	used!: boolean

	@CreateDateColumn({ name: 'created_at' })
	createdAt!: Date
}
