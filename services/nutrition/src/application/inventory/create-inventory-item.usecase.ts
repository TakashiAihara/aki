import { Injectable, Inject, BadRequestException } from '@nestjs/common';
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
import { CreateInventoryItemDto } from '@presentation/dto/create-inventory-item.dto';

export interface CreateInventoryItemCommand {
  dto: CreateInventoryItemDto;
  householdId: string | null;
  userId: string;
}

@Injectable()
export class CreateInventoryItemUseCase {
  constructor(
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryRepository: IInventoryItemRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(STORAGE_LOCATION_REPOSITORY)
    private readonly storageLocationRepository: IStorageLocationRepository,
  ) {}

  async execute(command: CreateInventoryItemCommand): Promise<InventoryItem> {
    const { dto, householdId, userId } = command;

    // Validate category exists
    const category = await this.categoryRepository.findById(dto.categoryId);
    if (!category) {
      throw new BadRequestException(`Category with ID ${dto.categoryId} not found`);
    }

    // Validate storage location exists (if provided)
    if (dto.storageLocationId) {
      const storageLocation = await this.storageLocationRepository.findById(dto.storageLocationId);
      if (!storageLocation) {
        throw new BadRequestException(`Storage location with ID ${dto.storageLocationId} not found`);
      }
    }

    // Parse expiration date
    const expirationDate = dto.expirationDate ? new Date(dto.expirationDate) : null;

    // Check for duplicates and merge if found
    const existingItem = await this.inventoryRepository.findDuplicates(
      householdId,
      dto.name,
      expirationDate,
    );

    if (existingItem) {
      // Merge quantities
      return this.inventoryRepository.mergeQuantity(existingItem.id, dto.quantity, userId);
    }

    // Create new item
    const item: Partial<InventoryItem> = {
      householdId,
      name: dto.name,
      quantity: dto.quantity,
      unit: dto.unit,
      expirationDate,
      categoryId: dto.categoryId,
      storageLocationId: dto.storageLocationId ?? null,
      notes: dto.notes ?? null,
      createdBy: userId,
      updatedBy: userId,
    };

    return this.inventoryRepository.create(item);
  }
}
