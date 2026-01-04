import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OAuthLink } from './oauth-link.entity';
import { RefreshToken } from './refresh-token.entity';

export enum UserStatus {
  ACTIVE = 'active',
  PENDING_DELETION = 'pending_deletion',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index('idx_users_email')
  email!: string;

  @Column({ type: 'varchar', length: 100, name: 'display_name' })
  displayName!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl?: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'household_id' })
  @Index('idx_users_household')
  householdId?: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserStatus.ACTIVE,
    enum: UserStatus,
  })
  @Index('idx_users_status')
  status!: UserStatus;

  @Column({ type: 'jsonb', default: '{}', name: 'notification_preferences' })
  notificationPreferences!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'deletion_scheduled_at' })
  @Index('idx_users_deletion')
  deletionScheduledAt?: Date | null;

  // Relations
  @OneToMany(() => OAuthLink, (oauthLink) => oauthLink.user)
  oauthLinks!: OAuthLink[];

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens!: RefreshToken[];

  // Helper methods
  isPendingDeletion(): boolean {
    return this.status === UserStatus.PENDING_DELETION;
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }
}
