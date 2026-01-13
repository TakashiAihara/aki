/**
 * Device Code Entity
 *
 * Represents an OAuth 2.0 Device Authorization Grant code (RFC 8628).
 * Used for CLI authentication where the user authorizes on a separate device.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum DeviceCodeStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  DENIED = 'denied',
  USED = 'used',
}

@Entity('device_codes')
export class DeviceCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, unique: true, name: 'device_code' })
  @Index('idx_device_codes_device_code')
  deviceCode!: string;

  @Column({ type: 'varchar', length: 9, unique: true, name: 'user_code' })
  @Index('idx_device_codes_user_code')
  userCode!: string;

  @Column({ type: 'varchar', length: 50, name: 'client_id' })
  clientId!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: DeviceCodeStatus.PENDING,
    enum: DeviceCodeStatus,
  })
  status!: DeviceCodeStatus;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  @Index('idx_device_codes_user')
  userId?: string | null;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  @Index('idx_device_codes_expires')
  expiresAt!: Date;

  @Column({ type: 'int', default: 5 })
  interval!: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_polled_at' })
  lastPolledAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isPending(): boolean {
    return this.status === DeviceCodeStatus.PENDING;
  }

  isAuthorized(): boolean {
    return this.status === DeviceCodeStatus.AUTHORIZED;
  }

  isDenied(): boolean {
    return this.status === DeviceCodeStatus.DENIED;
  }

  canPoll(): boolean {
    if (!this.lastPolledAt) return true;
    const timeSinceLastPoll = Date.now() - this.lastPolledAt.getTime();
    return timeSinceLastPoll >= this.interval * 1000;
  }
}
