import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from 'typeorm';
import { InventoryItem } from './inventory-item.entity';

@Entity('storage_locations')
export class StorageLocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index('idx_storage_name')
  name!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @OneToMany(() => InventoryItem, (item) => item.storageLocation)
  items!: InventoryItem[];
}
