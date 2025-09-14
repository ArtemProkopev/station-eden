import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'citext', unique: true })
  email!: string;

  @Column({ type: 'text', select: false })
  passwordHash!: string;

  @Column({ type: 'text', nullable: true })
  telegramId!: string | null;

  @Column({ type: 'text', default: 'user' })
  role!: 'user' | 'admin';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
