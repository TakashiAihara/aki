import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Household } from './household.entity';
import { User } from './user.entity';

export enum HouseholdRole {
  OWNER = 'owner',
  MEMBER = 'member',
}

@Entity('household_members')
@Unique('uq_user_household', ['userId'])
export class HouseholdMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'household_id' })
  householdId!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: HouseholdRole,
    default: HouseholdRole.MEMBER,
  })
  role!: HouseholdRole;

  @CreateDateColumn({ type: 'timestamptz', name: 'joined_at' })
  joinedAt!: Date;

  @ManyToOne(() => Household, (household) => household.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'household_id' })
  household!: Household;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
