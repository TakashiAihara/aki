import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index('idx_refresh_user')
  userId!: string;

  @Column({ type: 'varchar', length: 64, unique: true, name: 'token_hash' })
  @Index('idx_refresh_token_hash')
  tokenHash!: string;

  @Column({ type: 'jsonb', default: '{}', name: 'device_info' })
  deviceInfo!: Record<string, unknown>;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  @Index('idx_refresh_expires')
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}
