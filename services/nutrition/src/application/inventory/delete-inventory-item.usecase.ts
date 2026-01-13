import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IInventoryItemRepository,
  INVENTORY_ITEM_REPOSITORY,
} from '@domain/repositories/inventory-item.repository';

export interface DeleteInventoryItemCommand {
  itemId: string;
  householdId: string | null;
}

@Injectable()
export class DeleteInventoryItemUseCase {
  constructor(
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryRepository: IInventoryItemRepository,
  ) {}

  async execute(command: DeleteInventoryItemCommand): Promise<void> {
    const { itemId, householdId } = command;

    // Verify item exists and belongs to the household
    const existingItem = await this.inventoryRepository.findById(itemId, householdId);
    if (!existingItem) {
      throw new NotFoundException(`Inventory item with ID ${itemId} not found`);
    }

    const deleted = await this.inventoryRepository.delete(itemId);
    if (!deleted) {
      throw new NotFoundException(`Failed to delete inventory item with ID ${itemId}`);
    }
  }
}
