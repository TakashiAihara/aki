import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryItem } from '@domain/entities/inventory-item.entity';
import { ExpirationStatus, getExpirationStatus } from '@aki/shared';

export class CategoryResponseDto {
  @ApiProperty({ description: 'Category UUID' })
  id: string;

  @ApiProperty({ description: 'Category name' })
  name: string;

  @ApiPropertyOptional({ description: 'Category icon' })
  icon: string | null;

  @ApiProperty({ description: 'Sort order' })
  sortOrder: number;
}

export class StorageLocationResponseDto {
  @ApiProperty({ description: 'Storage location UUID' })
  id: string;

  @ApiProperty({ description: 'Storage location name' })
  name: string;

  @ApiProperty({ description: 'Sort order' })
  sortOrder: number;
}

export class InventoryItemResponseDto {
  @ApiProperty({ description: 'Item UUID' })
  id: string;

  @ApiPropertyOptional({ description: 'Household UUID (null for personal inventory)' })
  householdId: string | null;

  @ApiProperty({ description: 'Item name' })
  name: string;

  @ApiProperty({ description: 'Quantity' })
  quantity: number;

  @ApiProperty({ description: 'Unit of measurement' })
  unit: string;

  @ApiPropertyOptional({ description: 'Expiration date (ISO 8601)' })
  expirationDate: string | null;

  @ApiProperty({ description: 'Category' })
  category: CategoryResponseDto;

  @ApiPropertyOptional({ description: 'Storage location' })
  storageLocation: StorageLocationResponseDto | null;

  @ApiPropertyOptional({ description: 'Image URL' })
  imageUrl: string | null;

  @ApiPropertyOptional({ description: 'Notes' })
  notes: string | null;

  @ApiProperty({ description: 'Is item depleted (quantity = 0)' })
  isDepleted: boolean;

  @ApiProperty({ description: 'Expiration status', enum: ExpirationStatus })
  expirationStatus: ExpirationStatus;

  @ApiProperty({ description: 'Created by user UUID' })
  createdBy: string;

  @ApiProperty({ description: 'Created timestamp (ISO 8601)' })
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp (ISO 8601)' })
  updatedAt: string;

  @ApiProperty({ description: 'Updated by user UUID' })
  updatedBy: string;

  static fromEntity(entity: InventoryItem): InventoryItemResponseDto {
    const dto = new InventoryItemResponseDto();
    dto.id = entity.id;
    dto.householdId = entity.householdId;
    dto.name = entity.name;
    dto.quantity = Number(entity.quantity);
    dto.unit = entity.unit;
    dto.expirationDate = entity.expirationDate?.toISOString().split('T')[0] ?? null;
    dto.category = {
      id: entity.category.id,
      name: entity.category.name,
      icon: entity.category.icon,
      sortOrder: entity.category.sortOrder,
    };
    dto.storageLocation = entity.storageLocation
      ? {
          id: entity.storageLocation.id,
          name: entity.storageLocation.name,
          sortOrder: entity.storageLocation.sortOrder,
        }
      : null;
    dto.imageUrl = entity.imageUrl;
    dto.notes = entity.notes;
    dto.isDepleted = entity.isDepleted;
    dto.expirationStatus = getExpirationStatus(dto.expirationDate);
    dto.createdBy = entity.createdBy;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    dto.updatedBy = entity.updatedBy;
    return dto;
  }
}

export class PaginationDto {
  @ApiPropertyOptional({ description: 'Cursor for next page' })
  cursor: string | null;

  @ApiProperty({ description: 'Has more items' })
  hasMore: boolean;

  @ApiPropertyOptional({ description: 'Total count (if available)' })
  total?: number;
}

export class InventoryItemListResponseDto {
  @ApiProperty({ type: [InventoryItemResponseDto], description: 'List of inventory items' })
  items: InventoryItemResponseDto[];

  @ApiProperty({ description: 'Pagination info' })
  pagination: PaginationDto;
}
