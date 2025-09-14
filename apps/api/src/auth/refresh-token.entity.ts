import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Index({ unique: true })
  @Column({ name: 'token_hash', type: 'text' })
  tokenHash!: string;

  @Index()
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Index()
  @Column({ default: false })
  revoked!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
