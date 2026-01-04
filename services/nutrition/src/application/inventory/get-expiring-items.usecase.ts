import { Injectable, Inject } from '@nestjs/common';
import {
  IInventoryItemRepository,
  INVENTORY_ITEM_REPOSITORY,
} from '@domain/repositories/inventory-item.repository';
import { InventoryItem } from '@domain/entities/inventory-item.entity';

export interface GetExpiringItemsQuery {
  householdId: string | null;
  days: number;
}

@Injectable()
export class GetExpiringItemsUseCase {
  constructor(
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryRepository: IInventoryItemRepository,
  ) {}

  async execute(query: GetExpiringItemsQuery): Promise<InventoryItem[]> {
    return this.inventoryRepository.findExpiringSoon(query.householdId, query.days);
  }
}
