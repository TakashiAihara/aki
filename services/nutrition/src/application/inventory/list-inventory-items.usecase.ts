import { Injectable, Inject } from '@nestjs/common';
import {
  IInventoryItemRepository,
  INVENTORY_ITEM_REPOSITORY,
  PaginatedResult,
} from '@domain/repositories/inventory-item.repository';
import { InventoryItem } from '@domain/entities/inventory-item.entity';
import { InventoryItemFilterDto } from '@presentation/dto/inventory-item-filter.dto';

export interface ListInventoryItemsQuery {
  filter: InventoryItemFilterDto;
  householdId: string | null;
}

@Injectable()
export class ListInventoryItemsUseCase {
  constructor(
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryRepository: IInventoryItemRepository,
  ) {}

  async execute(query: ListInventoryItemsQuery): Promise<PaginatedResult<InventoryItem>> {
    return this.inventoryRepository.findByHousehold({
      householdId: query.householdId,
      search: query.filter.search,
      categoryId: query.filter.categoryId,
      storageLocationId: query.filter.storageLocationId,
      includeDepleted: query.filter.includeDepleted ?? false,
      expiringWithinDays: query.filter.expiringWithinDays,
      sortBy: query.filter.sortBy ?? 'createdAt',
      sortOrder: query.filter.sortOrder ?? 'desc',
      cursor: query.filter.cursor,
      limit: query.filter.limit ?? 50,
    });
  }
}
