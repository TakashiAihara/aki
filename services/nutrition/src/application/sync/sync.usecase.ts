import { Injectable, Inject } from '@nestjs/common';
import {
  IInventoryItemRepository,
  INVENTORY_ITEM_REPOSITORY,
} from '@domain/repositories/inventory-item.repository';
import { InventoryItem } from '@domain/entities/inventory-item.entity';
import {
  SyncRequest,
  SyncResponse,
  SyncConflict,
  SyncOperationType,
  InventoryItemDTO,
  CreateInventoryItemDTO,
  UpdateInventoryItemDTO,
} from '@aki/shared';

export interface SyncCommand {
  request: SyncRequest;
  householdId: string | null;
  userId: string;
}

@Injectable()
export class SyncUseCase {
  constructor(
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryRepository: IInventoryItemRepository,
  ) {}

  async execute(command: SyncCommand): Promise<SyncResponse> {
    const { request, householdId, userId } = command;
    const conflicts: SyncConflict[] = [];
    const processedItems: InventoryItem[] = [];

    // Process each operation
    for (const operation of request.operations) {
      try {
        switch (operation.type) {
          case SyncOperationType.CREATE:
            const created = await this.handleCreate(
              operation.data as CreateInventoryItemDTO,
              householdId,
              userId,
            );
            if (created) processedItems.push(created);
            break;

          case SyncOperationType.UPDATE:
            const updated = await this.handleUpdate(
              operation.entityId,
              operation.data as UpdateInventoryItemDTO,
              householdId,
              userId,
              operation.timestamp,
              conflicts,
            );
            if (updated) processedItems.push(updated);
            break;

          case SyncOperationType.DELETE:
            await this.handleDelete(operation.entityId, householdId);
            break;
        }
      } catch (error) {
        console.error(`Sync operation failed for ${operation.id}:`, error);
      }
    }

    // Get server changes since last sync
    const serverChanges = await this.getServerChanges(
      householdId,
      request.lastSyncTimestamp,
    );

    return {
      serverChanges: serverChanges.map(this.toDTO),
      conflicts,
      syncTimestamp: new Date().toISOString(),
    };
  }

  private async handleCreate(
    data: CreateInventoryItemDTO,
    householdId: string | null,
    userId: string,
  ): Promise<InventoryItem | null> {
    const expirationDate = data.expirationDate ? new Date(data.expirationDate) : null;

    // Check for duplicates
    const existing = await this.inventoryRepository.findDuplicates(
      householdId,
      data.name,
      expirationDate,
    );

    if (existing) {
      return this.inventoryRepository.mergeQuantity(existing.id, data.quantity, userId);
    }

    return this.inventoryRepository.create({
      householdId,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      expirationDate,
      categoryId: data.categoryId,
      storageLocationId: data.storageLocationId ?? null,
      notes: data.notes ?? null,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  private async handleUpdate(
    entityId: string,
    data: UpdateInventoryItemDTO,
    householdId: string | null,
    userId: string,
    clientTimestamp: string,
    conflicts: SyncConflict[],
  ): Promise<InventoryItem | null> {
    const existing = await this.inventoryRepository.findById(entityId, householdId);

    if (!existing) {
      return null;
    }

    // Last Write Wins: Compare timestamps
    const clientTime = new Date(clientTimestamp).getTime();
    const serverTime = existing.updatedAt.getTime();

    if (serverTime > clientTime) {
      // Server version is newer - report conflict but use server version
      conflicts.push({
        entityId,
        clientVersion: this.toDTO(existing), // Would need client version
        serverVersion: this.toDTO(existing),
        resolution: 'server',
        resolvedVersion: this.toDTO(existing),
      });
      return existing;
    }

    // Client version is newer - apply update
    const updateData: Partial<InventoryItem> = { updatedBy: userId };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.quantity !== undefined) {
      updateData.quantity = data.quantity;
      updateData.isDepleted = data.quantity === 0;
    }
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.expirationDate !== undefined) {
      updateData.expirationDate = data.expirationDate ? new Date(data.expirationDate) : null;
    }
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.storageLocationId !== undefined) updateData.storageLocationId = data.storageLocationId;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return this.inventoryRepository.update(entityId, updateData);
  }

  private async handleDelete(entityId: string, householdId: string | null): Promise<void> {
    const existing = await this.inventoryRepository.findById(entityId, householdId);
    if (existing) {
      await this.inventoryRepository.delete(entityId);
    }
  }

  private async getServerChanges(
    householdId: string | null,
    lastSyncTimestamp: string | null,
  ): Promise<InventoryItem[]> {
    // Get all items updated since last sync
    // For now, return all items. In production, add timestamp filtering
    const result = await this.inventoryRepository.findByHousehold({
      householdId,
      includeDepleted: true,
      limit: 1000,
    });

    if (!lastSyncTimestamp) {
      return result.items;
    }

    const lastSync = new Date(lastSyncTimestamp);
    return result.items.filter((item) => item.updatedAt > lastSync);
  }

  private toDTO(entity: InventoryItem): InventoryItemDTO {
    return {
      id: entity.id,
      householdId: entity.householdId,
      name: entity.name,
      quantity: Number(entity.quantity),
      unit: entity.unit,
      expirationDate: entity.expirationDate?.toISOString().split('T')[0] ?? null,
      categoryId: entity.categoryId,
      storageLocationId: entity.storageLocationId,
      imageUrl: entity.imageUrl,
      notes: entity.notes,
      isDepleted: entity.isDepleted,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      updatedBy: entity.updatedBy,
    };
  }
}
