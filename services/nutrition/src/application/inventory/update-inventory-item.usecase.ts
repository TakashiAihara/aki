import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  IInventoryItemRepository,
  INVENTORY_ITEM_REPOSITORY,
} from '@domain/repositories/inventory-item.repository';
import { ICategoryRepository, CATEGORY_REPOSITORY } from '@domain/repositories/category.repository';
import {
  IStorageLocationRepository,
  STORAGE_LOCATION_REPOSITORY,
} from '@domain/repositories/storage-location.repository';
import { InventoryItem } from '@domain/entities/inventory-item.entity';
import { UpdateInventoryItemDto } from '@presentation/dto/update-inventory-item.dto';

export interface UpdateInventoryItemCommand {
  itemId: string;
  dto: UpdateInventoryItemDto;
  householdId: string | null;
  userId: string;
}

@Injectable()
export class UpdateInventoryItemUseCase {
  constructor(
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryRepository: IInventoryItemRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(STORAGE_LOCATION_REPOSITORY)
    private readonly storageLocationRepository: IStorageLocationRepository,
  ) {}

  async execute(command: UpdateInventoryItemCommand): Promise<InventoryItem> {
    const { itemId, dto, householdId, userId } = command;

    // Verify item exists and belongs to the household
    const existingItem = await this.inventoryRepository.findById(itemId, householdId);
    if (!existingItem) {
      throw new NotFoundException(`Inventory item with ID ${itemId} not found`);
    }

    // Validate category if provided
    if (dto.categoryId) {
      const category = await this.categoryRepository.findById(dto.categoryId);
      if (!category) {
        throw new BadRequestException(`Category with ID ${dto.categoryId} not found`);
      }
    }

    // Validate storage location if provided
    if (dto.storageLocationId) {
      const storageLocation = await this.storageLocationRepository.findById(dto.storageLocationId);
      if (!storageLocation) {
        throw new BadRequestException(`Storage location with ID ${dto.storageLocationId} not found`);
      }
    }

    // Build update object
    const updateData: Partial<InventoryItem> = {
      updatedBy: userId,
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.quantity !== undefined) {
      updateData.quantity = dto.quantity;
      updateData.isDepleted = dto.quantity === 0;
    }
    if (dto.unit !== undefined) updateData.unit = dto.unit;
    if (dto.expirationDate !== undefined) {
      updateData.expirationDate = dto.expirationDate ? new Date(dto.expirationDate) : null;
    }
    if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId;
    if (dto.storageLocationId !== undefined) {
      updateData.storageLocationId = dto.storageLocationId;
    }
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updatedItem = await this.inventoryRepository.update(itemId, updateData);
    if (!updatedItem) {
      throw new NotFoundException(`Failed to update inventory item with ID ${itemId}`);
    }

    return updatedItem;
  }
}
