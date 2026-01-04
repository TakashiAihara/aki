import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from 'typeorm';
import { InventoryItem } from './inventory-item.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index('idx_categories_name')
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  @Column({ type: 'int', default: 0 })
  @Index('idx_categories_sort')
  sortOrder: number;

  @OneToMany(() => InventoryItem, (item) => item.category)
  items: InventoryItem[];
}
