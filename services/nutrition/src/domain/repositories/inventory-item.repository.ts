import { InventoryItem } from '../entities/inventory-item.entity';

export interface InventoryItemFilter {
  householdId?: string | null;
  search?: string;
  categoryId?: string;
  storageLocationId?: string;
  includeDepleted?: boolean;
  expiringWithinDays?: number;
  sortBy?: 'name' | 'createdAt' | 'expirationDate' | 'quantity';
  sortOrder?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface IInventoryItemRepository {
  create(item: Partial<InventoryItem>): Promise<InventoryItem>;
  update(id: string, item: Partial<InventoryItem>): Promise<InventoryItem | null>;
  delete(id: string): Promise<boolean>;
  findById(id: string, householdId: string | null): Promise<InventoryItem | null>;
  findByHousehold(filter: InventoryItemFilter): Promise<PaginatedResult<InventoryItem>>;
  findDuplicates(
    householdId: string | null,
    name: string,
    expirationDate: Date | null,
  ): Promise<InventoryItem | null>;
  mergeQuantity(id: string, additionalQuantity: number, updatedBy: string): Promise<InventoryItem>;
  findExpiringSoon(householdId: string | null, days: number): Promise<InventoryItem[]>;
  countByHousehold(householdId: string | null): Promise<number>;
}

export const INVENTORY_ITEM_REPOSITORY = Symbol('IInventoryItemRepository');
