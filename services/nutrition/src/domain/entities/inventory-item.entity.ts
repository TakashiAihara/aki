import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { Category } from './category.entity';
import { StorageLocation } from './storage-location.entity';

@Entity('inventory_items')
@Index('idx_inventory_household_created', ['householdId', 'createdAt'])
@Index('idx_inventory_household_name', ['householdId', 'name'])
@Check('CHK_quantity_positive', 'quantity >= 0')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_inventory_household')
  householdId: string | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity: number;

  @Column({ type: 'varchar', length: 20 })
  unit: string;

  @Column({ type: 'date', nullable: true })
  @Index('idx_inventory_expiration', { where: 'expiration_date IS NOT NULL' })
  expirationDate: Date | null;

  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.items, { eager: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'uuid', nullable: true })
  storageLocationId: string | null;

  @ManyToOne(() => StorageLocation, (location) => location.items, { eager: true, nullable: true })
  @JoinColumn({ name: 'storageLocationId' })
  storageLocation: StorageLocation | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'boolean', default: false })
  isDepleted: boolean;

  @Column({ type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ type: 'uuid' })
  updatedBy: string;

  /**
   * Check if the item is expired
   */
  isExpired(): boolean {
    if (!this.expirationDate) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.expirationDate < today;
  }

  /**
   * Check if the item is expiring soon (within 3 days)
   */
  isExpiringSoon(): boolean {
    if (!this.expirationDate) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return this.expirationDate >= today && this.expirationDate <= threeDaysFromNow;
  }

  /**
   * Update quantity and set depleted status
   */
  updateQuantity(newQuantity: number, updatedBy: string): void {
    this.quantity = newQuantity;
    this.isDepleted = newQuantity === 0;
    this.updatedBy = updatedBy;
  }
}
