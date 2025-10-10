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

  // ДОБАВЛЕНО: поле для аватара
  @Column({ type: 'text', nullable: true })
  avatar!: string | null

  // ДОБАВЛЕНО: поле для рамки
  @Column({ type: 'text', nullable: true })
  frame!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
