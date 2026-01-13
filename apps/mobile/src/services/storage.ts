import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { InventoryItemDTO, SyncOperation } from '@aki/shared';

const KEYS = {
  ACCESS_TOKEN: 'aki_access_token',
  REFRESH_TOKEN: 'aki_refresh_token',
  USER_EMAIL: 'aki_user_email',
  CACHED_INVENTORY: 'aki_cached_inventory',
  PENDING_SYNC: 'aki_pending_sync',
  LAST_SYNC: 'aki_last_sync',
};

// Secure storage for tokens
export const SecureStorage = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },

  async setAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },

  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, token);
  },

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
  },

  async isLoggedIn(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  },
};

// Regular storage for cached data
export const CacheStorage = {
  async getCachedInventory(): Promise<InventoryItemDTO[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CACHED_INVENTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async setCachedInventory(items: InventoryItemDTO[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.CACHED_INVENTORY, JSON.stringify(items));
  },

  async getLastSync(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.LAST_SYNC);
  },

  async setLastSync(timestamp: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.LAST_SYNC, timestamp);
  },

  async clearCache(): Promise<void> {
    await AsyncStorage.multiRemove([
      KEYS.CACHED_INVENTORY,
      KEYS.LAST_SYNC,
    ]);
  },
};

// Offline sync queue
export const SyncQueue = {
  async getPendingOperations(): Promise<SyncOperation[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PENDING_SYNC);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async addOperation(operation: SyncOperation): Promise<void> {
    const operations = await this.getPendingOperations();
    operations.push(operation);
    await AsyncStorage.setItem(KEYS.PENDING_SYNC, JSON.stringify(operations));
  },

  async clearPendingOperations(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.PENDING_SYNC);
  },

  async removeOperation(id: string): Promise<void> {
    const operations = await this.getPendingOperations();
    const filtered = operations.filter(op => op.id !== id);
    await AsyncStorage.setItem(KEYS.PENDING_SYNC, JSON.stringify(filtered));
  },

  async hasPendingOperations(): Promise<boolean> {
    const operations = await this.getPendingOperations();
    return operations.length > 0;
  },
};
