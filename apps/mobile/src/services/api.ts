import axios, { AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import { SecureStorage, CacheStorage, SyncQueue } from './storage';
import {
  InventoryItemDTO,
  CreateInventoryItemDTO,
  UpdateInventoryItemDTO,
  CategoryDTO,
  StorageLocationDTO,
  InventoryItemListResponse,
  SyncOperation,
  SyncOperationType,
  SyncRequest,
  SyncResponse,
} from '@aki/shared';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3002';

class ApiService {
  private client: AxiosInstance;
  private isOnline = true;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private async setupInterceptors() {
    this.client.interceptors.request.use(async (config) => {
      const token = await SecureStorage.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (!error.response) {
          this.isOnline = false;
        }
        throw error;
      }
    );
  }

  setOnlineStatus(online: boolean) {
    this.isOnline = online;
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Inventory operations with offline support
  async listInventory(): Promise<InventoryItemListResponse> {
    try {
      const response = await this.client.get<InventoryItemListResponse>('/api/v1/inventory');
      // Cache the result
      await CacheStorage.setCachedInventory(response.data.items);
      await CacheStorage.setLastSync(new Date().toISOString());
      this.isOnline = true;
      return response.data;
    } catch {
      this.isOnline = false;
      // Return cached data when offline
      const cachedItems = await CacheStorage.getCachedInventory();
      return {
        items: cachedItems,
        pagination: { cursor: null, hasMore: false },
      };
    }
  }

  async createInventoryItem(data: CreateInventoryItemDTO): Promise<InventoryItemDTO | null> {
    if (!this.isOnline) {
      // Queue for sync
      const operation: SyncOperation = {
        id: `create-${Date.now()}`,
        type: SyncOperationType.CREATE,
        entityType: 'inventory_item',
        entityId: `temp-${Date.now()}`,
        data,
        timestamp: new Date().toISOString(),
        clientId: 'mobile',
      };
      await SyncQueue.addOperation(operation);
      return null;
    }

    const response = await this.client.post<InventoryItemDTO>('/api/v1/inventory', data);
    return response.data;
  }

  async updateInventoryItem(id: string, data: UpdateInventoryItemDTO): Promise<InventoryItemDTO | null> {
    if (!this.isOnline) {
      const operation: SyncOperation = {
        id: `update-${Date.now()}`,
        type: SyncOperationType.UPDATE,
        entityType: 'inventory_item',
        entityId: id,
        data,
        timestamp: new Date().toISOString(),
        clientId: 'mobile',
      };
      await SyncQueue.addOperation(operation);
      return null;
    }

    const response = await this.client.put<InventoryItemDTO>(`/api/v1/inventory/${id}`, data);
    return response.data;
  }

  async deleteInventoryItem(id: string): Promise<void> {
    if (!this.isOnline) {
      const operation: SyncOperation = {
        id: `delete-${Date.now()}`,
        type: SyncOperationType.DELETE,
        entityType: 'inventory_item',
        entityId: id,
        data: null,
        timestamp: new Date().toISOString(),
        clientId: 'mobile',
      };
      await SyncQueue.addOperation(operation);
      return;
    }

    await this.client.delete(`/api/v1/inventory/${id}`);
  }

  async getExpiringItems(days: number = 3): Promise<InventoryItemDTO[]> {
    try {
      const response = await this.client.get<InventoryItemDTO[]>('/api/v1/inventory/expiring', {
        params: { days },
      });
      return response.data;
    } catch {
      // Return from cache, filter by expiration
      const cached = await CacheStorage.getCachedInventory();
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + days);

      return cached.filter((item) => {
        if (!item.expirationDate) return false;
        const expDate = new Date(item.expirationDate);
        return expDate >= now && expDate <= futureDate;
      });
    }
  }

  // Reference data
  async getCategories(): Promise<CategoryDTO[]> {
    const response = await this.client.get<CategoryDTO[]>('/api/v1/categories');
    return response.data;
  }

  async getStorageLocations(): Promise<StorageLocationDTO[]> {
    const response = await this.client.get<StorageLocationDTO[]>('/api/v1/storage-locations');
    return response.data;
  }

  // Sync operations
  async syncPendingOperations(): Promise<SyncResponse | null> {
    const operations = await SyncQueue.getPendingOperations();
    if (operations.length === 0) return null;

    const lastSync = await CacheStorage.getLastSync();

    try {
      const request: SyncRequest = {
        operations,
        lastSyncTimestamp: lastSync,
      };

      const response = await this.client.post<SyncResponse>('/api/v1/sync', request);

      // Clear pending operations after successful sync
      await SyncQueue.clearPendingOperations();
      await CacheStorage.setLastSync(response.data.syncTimestamp);

      // Update cache with server changes
      if (response.data.serverChanges.length > 0) {
        const cached = await CacheStorage.getCachedInventory();
        const merged = this.mergeInventory(cached, response.data.serverChanges);
        await CacheStorage.setCachedInventory(merged);
      }

      return response.data;
    } catch {
      return null;
    }
  }

  private mergeInventory(cached: InventoryItemDTO[], server: InventoryItemDTO[]): InventoryItemDTO[] {
    const map = new Map<string, InventoryItemDTO>();

    // Add cached items
    for (const item of cached) {
      map.set(item.id, item);
    }

    // Merge/override with server items (Last Write Wins)
    for (const item of server) {
      map.set(item.id, item);
    }

    return Array.from(map.values());
  }
}

export const apiService = new ApiService();
