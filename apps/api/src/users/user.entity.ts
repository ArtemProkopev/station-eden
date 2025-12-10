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

	@Column({
		name: 'password_hash',
		type: 'text',
		select: false,
		nullable: true,
	})
	passwordHash!: string | null

	@Index({ unique: true })
	@Column({ type: 'citext', unique: true, nullable: true })
	username!: string | null

	@Column({ name: 'telegram_id', type: 'text', nullable: true })
	telegramId!: string | null

	@Column({ type: 'text', default: 'user' })
	role!: 'user' | 'admin'

	@Column({ type: 'text', nullable: true })
	avatar!: string | null

	@Column({ type: 'text', nullable: true })
	frame!: string | null

	// когда пользователь в последний раз менял ник
	@Column({ name: 'username_changed_at', type: 'timestamptz', nullable: true })
	usernameChangedAt!: Date | null

	@CreateDateColumn({ name: 'created_at' })
	createdAt!: Date

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt!: Date
}
