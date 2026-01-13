import { BadRequestException } from '@nestjs/common';
import { CreateInventoryItemUseCase } from '../../src/application/inventory/create-inventory-item.usecase';
import { IInventoryItemRepository } from '../../src/domain/repositories/inventory-item.repository';
import { ICategoryRepository } from '../../src/domain/repositories/category.repository';
import { IStorageLocationRepository } from '../../src/domain/repositories/storage-location.repository';
import { InventoryItem } from '../../src/domain/entities/inventory-item.entity';
import { Category } from '../../src/domain/entities/category.entity';
import { StorageLocation } from '../../src/domain/entities/storage-location.entity';

describe('CreateInventoryItemUseCase', () => {
  let useCase: CreateInventoryItemUseCase;
  let mockInventoryRepository: jest.Mocked<IInventoryItemRepository>;
  let mockCategoryRepository: jest.Mocked<ICategoryRepository>;
  let mockStorageLocationRepository: jest.Mocked<IStorageLocationRepository>;

  const mockCategory: Category = {
    id: 'category-uuid',
    name: '野菜',
    icon: '🥬',
    sortOrder: 1,
    items: [],
  };

  const mockStorageLocation: StorageLocation = {
    id: 'storage-uuid',
    name: '冷蔵庫',
    sortOrder: 1,
    items: [],
  };

  beforeEach(() => {
    mockInventoryRepository = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      findByHousehold: jest.fn(),
      findDuplicates: jest.fn(),
      mergeQuantity: jest.fn(),
      findExpiringSoon: jest.fn(),
      countByHousehold: jest.fn(),
    };

    mockCategoryRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
    };

    mockStorageLocationRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
    };

    useCase = new CreateInventoryItemUseCase(
      mockInventoryRepository,
      mockCategoryRepository,
      mockStorageLocationRepository,
    );
  });

  it('should create a new inventory item', async () => {
    const dto = {
      name: 'りんご',
      quantity: 5,
      unit: '個',
      categoryId: 'category-uuid',
      storageLocationId: 'storage-uuid',
    };

    const expectedItem: Partial<InventoryItem> = {
      id: 'item-uuid',
      householdId: 'household-uuid',
      name: 'りんご',
      quantity: 5,
      unit: '個',
      categoryId: 'category-uuid',
      storageLocationId: 'storage-uuid',
      isDepleted: false,
      createdBy: 'user-uuid',
      updatedBy: 'user-uuid',
      category: mockCategory,
      storageLocation: mockStorageLocation,
    };

    mockCategoryRepository.findById.mockResolvedValue(mockCategory);
    mockStorageLocationRepository.findById.mockResolvedValue(mockStorageLocation);
    mockInventoryRepository.findDuplicates.mockResolvedValue(null);
    mockInventoryRepository.create.mockResolvedValue(expectedItem as InventoryItem);

    const result = await useCase.execute({
      dto,
      householdId: 'household-uuid',
      userId: 'user-uuid',
    });

    expect(result).toBeDefined();
    expect(result.name).toBe('りんご');
    expect(mockInventoryRepository.create).toHaveBeenCalled();
  });

  it('should merge quantities when duplicate item exists', async () => {
    const dto = {
      name: 'りんご',
      quantity: 3,
      unit: '個',
      categoryId: 'category-uuid',
    };

    const existingItem: Partial<InventoryItem> = {
      id: 'existing-item-uuid',
      name: 'りんご',
      quantity: 5,
      unit: '個',
      categoryId: 'category-uuid',
      isDepleted: false,
      category: mockCategory,
    };

    const mergedItem: Partial<InventoryItem> = {
      ...existingItem,
      quantity: 8, // 5 + 3
    };

    mockCategoryRepository.findById.mockResolvedValue(mockCategory);
    mockInventoryRepository.findDuplicates.mockResolvedValue(existingItem as InventoryItem);
    mockInventoryRepository.mergeQuantity.mockResolvedValue(mergedItem as InventoryItem);

    const result = await useCase.execute({
      dto,
      householdId: 'household-uuid',
      userId: 'user-uuid',
    });

    expect(result.quantity).toBe(8);
    expect(mockInventoryRepository.mergeQuantity).toHaveBeenCalledWith(
      'existing-item-uuid',
      3,
      'user-uuid',
    );
    expect(mockInventoryRepository.create).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when category not found', async () => {
    const dto = {
      name: 'りんご',
      quantity: 5,
      unit: '個',
      categoryId: 'non-existent-uuid',
    };

    mockCategoryRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        dto,
        householdId: 'household-uuid',
        userId: 'user-uuid',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when storage location not found', async () => {
    const dto = {
      name: 'りんご',
      quantity: 5,
      unit: '個',
      categoryId: 'category-uuid',
      storageLocationId: 'non-existent-uuid',
    };

    mockCategoryRepository.findById.mockResolvedValue(mockCategory);
    mockStorageLocationRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        dto,
        householdId: 'household-uuid',
        userId: 'user-uuid',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
