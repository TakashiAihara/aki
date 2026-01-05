import { Injectable } from '@nestjs/common';
import { db } from './drizzle.config';
import { inventoryItems, categories, storageLocations, InventoryItem } from './schema';
import { eq, and, or, like, desc, asc, sql, isNull } from 'drizzle-orm';
import {
  IInventoryItemRepository,
  InventoryItemFilter,
  PaginatedResult,
} from '@domain/repositories/inventory-item.repository';

@Injectable()
export class InventoryItemRepositoryImpl implements IInventoryItemRepository {

  async create(item: Partial<InventoryItem>): Promise<InventoryItem> {
    const result = await db.insert(inventoryItems).values({
      id: item.id,
      householdId: item.householdId,
      name: item.name!,
      quantity: item.quantity!,
      unit: item.unit!,
      expirationDate: item.expirationDate,
      categoryId: item.categoryId!,
      storageLocationId: item.storageLocationId,
      imageUrl: item.imageUrl,
      notes: item.notes,
      isDepleted: item.isDepleted!,
      createdBy: item.createdBy!,
      createdAt: item.createdAt!,
      updatedAt: item.updatedAt!,
      updatedBy: item.updatedBy!,
    }).returning();

    const inserted = result[0];
    return this.findById(inserted.id, item.householdId);
  }

  async update(id: string, item: Partial<InventoryItem>): Promise<InventoryItem | null> {
    await db.update(inventoryItems)
      .set({
        householdId: item.householdId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expirationDate: item.expirationDate,
        categoryId: item.categoryId,
        storageLocationId: item.storageLocationId,
        imageUrl: item.imageUrl,
        notes: item.notes,
        isDepleted: item.isDepleted,
        updatedAt: item.updatedAt,
        updatedBy: item.updatedBy,
      })
      .where(eq(inventoryItems.id, id));

    return this.findById(id, item.householdId);
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
    return result.rowCount > 0;
  }

  async findById(id: string, householdId: string | null): Promise<InventoryItem | null> {
    const result = await db.select({
      ...inventoryItems,
      category: categories,
      storageLocation: storageLocations,
    })
      .from(inventoryItems)
      .leftJoin(categories, eq(inventoryItems.categoryId, categories.id))
      .leftJoin(storageLocations, eq(inventoryItems.storageLocationId, storageLocations.id))
      .where(and(
        eq(inventoryItems.id, id),
        householdId ? eq(inventoryItems.householdId, householdId) : isNull(inventoryItems.householdId)
      ))
      .limit(1);

    return result[0] || null;
  }

  async findByHousehold(filter: InventoryItemFilter): Promise<PaginatedResult<InventoryItem>> {
    const limit = filter.limit ?? 50;
    const qb = this.buildFilterQuery(filter);

    // Handle cursor-based pagination
    if (filter.cursor) {
      const [cursorDate, cursorId] = this.decodeCursor(filter.cursor);
      qb.andWhere('(item.createdAt < :cursorDate OR (item.createdAt = :cursorDate AND item.id < :cursorId))', {
        cursorDate,
        cursorId,
      });
    }

    qb.take(limit + 1); // Fetch one extra to check if there are more

    const items = await qb.getMany();
    const hasMore = items.length > limit;

    if (hasMore) {
      items.pop(); // Remove the extra item
    }

    const lastItem = items[items.length - 1];
    const cursor = lastItem ? this.encodeCursor(lastItem.createdAt, lastItem.id) : null;

    return {
      items,
      cursor,
      hasMore,
    };
  }

  async findDuplicates(
    householdId: string | null,
    name: string,
    expirationDate: Date | null,
  ): Promise<InventoryItem | null> {
    const qb = this.repository.createQueryBuilder('item');

    if (householdId) {
      qb.where('item.householdId = :householdId', { householdId });
    } else {
      qb.where('item.householdId IS NULL');
    }

    qb.andWhere('LOWER(item.name) = LOWER(:name)', { name });

    if (expirationDate) {
      qb.andWhere('item.expirationDate = :expirationDate', { expirationDate });
    } else {
      qb.andWhere('item.expirationDate IS NULL');
    }

    return qb.getOne();
  }

  async mergeQuantity(
    id: string,
    additionalQuantity: number,
    updatedBy: string,
  ): Promise<InventoryItem> {
    await this.repository
      .createQueryBuilder()
      .update(InventoryItem)
      .set({
        quantity: () => `quantity + ${additionalQuantity}`,
        isDepleted: false,
        updatedBy,
      })
      .where('id = :id', { id })
      .execute();

    const updated = await this.repository.findOne({
      where: { id },
      relations: ['category', 'storageLocation'],
    });

    if (!updated) {
      throw new Error(`Item with id ${id} not found after merge`);
    }

    return updated;
  }

  async findExpiringSoon(householdId: string | null, days: number): Promise<InventoryItem[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    const qb = this.repository.createQueryBuilder('item');

    if (householdId) {
      qb.where('item.householdId = :householdId', { householdId });
    } else {
      qb.where('item.householdId IS NULL');
    }

    qb.andWhere('item.expirationDate IS NOT NULL')
      .andWhere('item.expirationDate BETWEEN :today AND :futureDate', { today, futureDate })
      .andWhere('item.isDepleted = false')
      .orderBy('item.expirationDate', 'ASC');

    return qb.getMany();
  }

  async countByHousehold(householdId: string | null): Promise<number> {
    const qb = this.repository.createQueryBuilder('item');

    if (householdId) {
      qb.where('item.householdId = :householdId', { householdId });
    } else {
      qb.where('item.householdId IS NULL');
    }

    return qb.getCount();
  }

  private buildFilterQuery(filter: InventoryItemFilter): SelectQueryBuilder<InventoryItem> {
    const qb = this.repository.createQueryBuilder('item');

    // Join relations
    qb.leftJoinAndSelect('item.category', 'category');
    qb.leftJoinAndSelect('item.storageLocation', 'storageLocation');

    // Household filter (required for data isolation)
    if (filter.householdId) {
      qb.where('item.householdId = :householdId', { householdId: filter.householdId });
    } else {
      qb.where('item.householdId IS NULL');
    }

    // Search by name
    if (filter.search) {
      qb.andWhere('LOWER(item.name) LIKE LOWER(:search)', { search: `%${filter.search}%` });
    }

    // Category filter
    if (filter.categoryId) {
      qb.andWhere('item.categoryId = :categoryId', { categoryId: filter.categoryId });
    }

    // Storage location filter
    if (filter.storageLocationId) {
      qb.andWhere('item.storageLocationId = :storageLocationId', {
        storageLocationId: filter.storageLocationId,
      });
    }

    // Depleted filter (default: exclude depleted items)
    if (!filter.includeDepleted) {
      qb.andWhere('item.isDepleted = false');
    }

    // Expiring soon filter
    if (filter.expiringWithinDays !== undefined) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + filter.expiringWithinDays);

      qb.andWhere('item.expirationDate IS NOT NULL');
      qb.andWhere('item.expirationDate BETWEEN :today AND :futureDate', { today, futureDate });
    }

    // Sorting
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = (filter.sortOrder?.toUpperCase() ?? 'DESC') as 'ASC' | 'DESC';

    switch (sortBy) {
      case 'name':
        qb.orderBy('item.name', sortOrder);
        break;
      case 'expirationDate':
        qb.orderBy('item.expirationDate', sortOrder, 'NULLS LAST');
        break;
      case 'quantity':
        qb.orderBy('item.quantity', sortOrder);
        break;
      case 'createdAt':
      default:
        qb.orderBy('item.createdAt', sortOrder);
        break;
    }

    // Secondary sort by ID for stable pagination
    qb.addOrderBy('item.id', sortOrder);

    return qb;
  }

  private encodeCursor(date: Date, id: string): string {
    return Buffer.from(`${date.toISOString()}:${id}`).toString('base64');
  }

  private decodeCursor(cursor: string): [Date, string] {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    const [dateStr, id] = decoded.split(':');
    return [new Date(dateStr), id];
  }
}
