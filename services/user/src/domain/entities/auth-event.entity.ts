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

export enum AuthEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REVOKE = 'TOKEN_REVOKE',
  TOKEN_REVOKE_ALL = 'TOKEN_REVOKE_ALL',
  LOGOUT = 'LOGOUT',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  ACCOUNT_DELETION_REQUESTED = 'ACCOUNT_DELETION_REQUESTED',
  ACCOUNT_DELETION_CANCELLED = 'ACCOUNT_DELETION_CANCELLED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  HOUSEHOLD_CREATED = 'HOUSEHOLD_CREATED',
  HOUSEHOLD_JOINED = 'HOUSEHOLD_JOINED',
  HOUSEHOLD_LEFT = 'HOUSEHOLD_LEFT',
  HOUSEHOLD_MEMBER_REMOVED = 'HOUSEHOLD_MEMBER_REMOVED',
}

@Entity('auth_events')
export class AuthEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  @Index('idx_auth_event_user')
  userId?: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'event_type',
    enum: AuthEventType,
  })
  @Index('idx_auth_event_type')
  eventType!: AuthEventType;

  @Column({ type: 'inet', name: 'ip_address' })
  ipAddress!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'user_agent' })
  userAgent?: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  @Index('idx_auth_event_time')
  createdAt!: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;
}
