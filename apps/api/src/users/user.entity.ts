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

	// в БД колонка password_hash
	@Column({ name: 'password_hash', type: 'text', select: false })
	passwordHash!: string

	// в БД колонка telegram_id
	@Column({ name: 'telegram_id', type: 'text', nullable: true })
	telegramId!: string | null

	// только две роли
	@Column({ type: 'text', default: 'user' })
	role!: 'user' | 'admin'

	@CreateDateColumn({ name: 'created_at' })
	createdAt!: Date

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt!: Date
}
