import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IInventoryItemRepository,
  INVENTORY_ITEM_REPOSITORY,
} from '@domain/repositories/inventory-item.repository';
import { InventoryItem } from '@domain/entities/inventory-item.entity';

export interface GetInventoryItemQuery {
  itemId: string;
  householdId: string | null;
}

@Injectable()
export class GetInventoryItemUseCase {
  constructor(
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryRepository: IInventoryItemRepository,
  ) {}

  async execute(query: GetInventoryItemQuery): Promise<InventoryItem> {
    const item = await this.inventoryRepository.findById(query.itemId, query.householdId);

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${query.itemId} not found`);
    }

    return item;
  }
}
