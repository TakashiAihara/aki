/**
 * Nutrition Service shared types for Akimi inventory management
 */

// ============================================================================
// Inventory Item Types
// ============================================================================

/**
 * Inventory item data transfer object
 */
export interface InventoryItemDTO {
  id: string;
  householdId: string | null;
  name: string;
  quantity: number;
  unit: string;
  expirationDate: string | null;
  categoryId: string;
  storageLocationId: string | null;
  imageUrl: string | null;
  notes: string | null;
  isDepleted: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Create inventory item request
 */
export interface CreateInventoryItemDTO {
  name: string;
  quantity: number;
  unit: string;
  expirationDate?: string | null;
  categoryId: string;
  storageLocationId?: string | null;
  notes?: string | null;
}

/**
 * Update inventory item request
 */
export interface UpdateInventoryItemDTO {
  name?: string;
  quantity?: number;
  unit?: string;
  expirationDate?: string | null;
  categoryId?: string;
  storageLocationId?: string | null;
  notes?: string | null;
}

/**
 * Inventory item list response with pagination
 */
export interface InventoryItemListResponse {
  items: InventoryItemDTO[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

/**
 * Inventory item search/filter parameters
 */
export interface InventoryItemFilter {
  search?: string;
  categoryId?: string;
  storageLocationId?: string;
  includeDepleted?: boolean;
  expiringWithinDays?: number;
  sortBy?: 'name' | 'createdAt' | 'expirationDate' | 'quantity';
  sortOrder?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
}

// ============================================================================
// Category Types
// ============================================================================

/**
 * Category data transfer object
 */
export interface CategoryDTO {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
}

/**
 * Predefined category names (Japanese)
 */
export const CATEGORY_NAMES = {
  VEGETABLES: '野菜',
  FRUITS: '果物',
  MEAT: '肉類',
  SEAFOOD: '魚類',
  DAIRY: '乳製品',
  CONDIMENTS: '調味料',
  BEVERAGES: '飲料',
  HOUSEHOLD: '日用品',
  OTHER: 'その他',
} as const;

export type CategoryName = (typeof CATEGORY_NAMES)[keyof typeof CATEGORY_NAMES];

// ============================================================================
// Storage Location Types
// ============================================================================

/**
 * Storage location data transfer object
 */
export interface StorageLocationDTO {
  id: string;
  name: string;
  sortOrder: number;
}

/**
 * Predefined storage location names (Japanese)
 */
export const STORAGE_LOCATION_NAMES = {
  REFRIGERATOR: '冷蔵庫',
  FREEZER: '冷凍庫',
  PANTRY: 'パントリー',
  SHELF: '棚',
  OTHER: 'その他',
} as const;

export type StorageLocationName =
  (typeof STORAGE_LOCATION_NAMES)[keyof typeof STORAGE_LOCATION_NAMES];

// ============================================================================
// Common Units
// ============================================================================

/**
 * Common measurement units (Japanese)
 */
export const MEASUREMENT_UNITS = {
  PIECE: '個',
  GRAM: 'g',
  KILOGRAM: 'kg',
  MILLILITER: 'ml',
  LITER: 'L',
  PACK: 'パック',
  BOTTLE: '本',
  BAG: '袋',
  BOX: '箱',
  CAN: '缶',
} as const;

export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[keyof typeof MEASUREMENT_UNITS];

// ============================================================================
// Expiration Status
// ============================================================================

/**
 * Expiration status for inventory items
 */
export enum ExpirationStatus {
  /** No expiration date set */
  NONE = 'none',
  /** Item is fresh (more than 3 days until expiration) */
  FRESH = 'fresh',
  /** Item expires within 3 days */
  EXPIRING_SOON = 'expiring_soon',
  /** Item has expired */
  EXPIRED = 'expired',
}

/**
 * Calculate expiration status from date
 */
export function getExpirationStatus(expirationDate: string | null): ExpirationStatus {
  if (!expirationDate) {
    return ExpirationStatus.NONE;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return ExpirationStatus.EXPIRED;
  }
  if (diffDays <= 3) {
    return ExpirationStatus.EXPIRING_SOON;
  }
  return ExpirationStatus.FRESH;
}

// ============================================================================
// Sync Types (for offline-first mobile app)
// ============================================================================

/**
 * Sync operation type
 */
export enum SyncOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

/**
 * Sync operation for offline changes
 */
export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  entityType: 'inventory_item';
  entityId: string;
  data: CreateInventoryItemDTO | UpdateInventoryItemDTO | null;
  timestamp: string;
  clientId: string;
}

/**
 * Sync request from client
 */
export interface SyncRequest {
  operations: SyncOperation[];
  lastSyncTimestamp: string | null;
}

/**
 * Sync response from server
 */
export interface SyncResponse {
  serverChanges: InventoryItemDTO[];
  conflicts: SyncConflict[];
  syncTimestamp: string;
}

/**
 * Sync conflict resolution (Last Write Wins)
 */
export interface SyncConflict {
  entityId: string;
  clientVersion: InventoryItemDTO;
  serverVersion: InventoryItemDTO;
  resolution: 'client' | 'server';
  resolvedVersion: InventoryItemDTO;
}
