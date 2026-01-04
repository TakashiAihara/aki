import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

export enum OAuthProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
}

@Entity('oauth_links')
@Unique('uq_oauth_provider_uid', ['provider', 'providerUserId'])
export class OAuthLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index('idx_oauth_user')
  userId!: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: OAuthProvider,
  })
  provider!: OAuthProvider;

  @Column({ type: 'varchar', length: 255, name: 'provider_user_id' })
  providerUserId!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.oauthLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
