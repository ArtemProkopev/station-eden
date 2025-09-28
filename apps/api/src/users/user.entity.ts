// apps/api/src/users/user.entity.ts
import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm'

@Entity('users')
export class User {
	@PrimaryGeneratedColumn('uuid')
	id!: string

	@Index({ unique: true })
	@Column({ type: 'citext', unique: true })
	email!: string

	// может быть NULL для "oauth-only" учёток
	@Column({
		name: 'password_hash',
		type: 'text',
		select: false,
		nullable: true,
	})
	passwordHash!: string | null

	@Column({ name: 'telegram_id', type: 'text', nullable: true })
	telegramId!: string | null

	@Column({ type: 'text', default: 'user' })
	role!: 'user' | 'admin'

	@CreateDateColumn({ name: 'created_at' })
	createdAt!: Date

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt!: Date
}
