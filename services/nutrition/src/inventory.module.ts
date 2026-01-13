import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Category } from '@domain/entities/category.entity';
import { StorageLocation } from '@domain/entities/storage-location.entity';
import { InventoryItem } from '@domain/entities/inventory-item.entity';

// Repository interfaces
import { CATEGORY_REPOSITORY } from '@domain/repositories/category.repository';
import { STORAGE_LOCATION_REPOSITORY } from '@domain/repositories/storage-location.repository';
import { INVENTORY_ITEM_REPOSITORY } from '@domain/repositories/inventory-item.repository';

// Repository implementations
import { CategoryRepositoryImpl } from '@infrastructure/persistence/category.repository.impl';
import { StorageLocationRepositoryImpl } from '@infrastructure/persistence/storage-location.repository.impl';
import { InventoryItemRepositoryImpl } from '@infrastructure/persistence/inventory-item.repository.impl';

// Use cases
import { CreateInventoryItemUseCase } from '@application/inventory/create-inventory-item.usecase';
import { GetInventoryItemUseCase } from '@application/inventory/get-inventory-item.usecase';
import { ListInventoryItemsUseCase } from '@application/inventory/list-inventory-items.usecase';
import { UpdateInventoryItemUseCase } from '@application/inventory/update-inventory-item.usecase';
import { DeleteInventoryItemUseCase } from '@application/inventory/delete-inventory-item.usecase';
import { GetExpiringItemsUseCase } from '@application/inventory/get-expiring-items.usecase';
import { SyncUseCase } from '@application/sync/sync.usecase';

// Controllers
import { InventoryController } from '@presentation/controllers/inventory.controller';
import { CategoryController } from '@presentation/controllers/category.controller';
import { StorageLocationController } from '@presentation/controllers/storage-location.controller';
import { SyncController } from '@presentation/controllers/sync.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category, StorageLocation, InventoryItem])],
  controllers: [InventoryController, CategoryController, StorageLocationController, SyncController],
  providers: [
    // Repositories
    {
      provide: CATEGORY_REPOSITORY,
      useClass: CategoryRepositoryImpl,
    },
    {
      provide: STORAGE_LOCATION_REPOSITORY,
      useClass: StorageLocationRepositoryImpl,
    },
    {
      provide: INVENTORY_ITEM_REPOSITORY,
      useClass: InventoryItemRepositoryImpl,
    },

    // Use cases
    CreateInventoryItemUseCase,
    GetInventoryItemUseCase,
    ListInventoryItemsUseCase,
    UpdateInventoryItemUseCase,
    DeleteInventoryItemUseCase,
    GetExpiringItemsUseCase,
    SyncUseCase,
  ],
  exports: [CATEGORY_REPOSITORY, STORAGE_LOCATION_REPOSITORY, INVENTORY_ITEM_REPOSITORY],
})
export class InventoryModule {}
