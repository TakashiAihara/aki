import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Household } from './household.entity';

@Entity('household_invites')
export class HouseholdInvite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'household_id' })
  householdId!: string;

  @Column({ type: 'varchar', length: 8, unique: true })
  @Index('idx_invite_code')
  code!: string;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy!: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'boolean', default: false })
  used!: boolean;

  @Column({ type: 'uuid', name: 'used_by', nullable: true })
  usedBy?: string | null;

  @Column({ type: 'timestamptz', name: 'used_at', nullable: true })
  usedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Household, (household) => household.invites, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'household_id' })
  household!: Household;

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isValid(): boolean {
    return !this.used && !this.isExpired();
  }
}
