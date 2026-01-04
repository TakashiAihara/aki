import axios, { AxiosInstance, AxiosError } from 'axios';
import { ConfigService } from './config.service';
import {
  InventoryItemDTO,
  CreateInventoryItemDTO,
  UpdateInventoryItemDTO,
  CategoryDTO,
  StorageLocationDTO,
  InventoryItemListResponse,
} from '@akimi/shared';

interface ApiError {
  message: string;
  statusCode: number;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: ConfigService.getApiUrl(),
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      const token = ConfigService.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          ConfigService.clearAuth();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(
          error.response?.data?.message || error.message || 'An error occurred',
        );
      },
    );
  }

  updateBaseUrl(): void {
    this.client.defaults.baseURL = ConfigService.getApiUrl();
  }

  // Inventory operations
  async listInventory(params?: {
    search?: string;
    categoryId?: string;
    storageLocationId?: string;
    includeDepleted?: boolean;
    expiringWithinDays?: number;
    limit?: number;
    cursor?: string;
  }): Promise<InventoryItemListResponse> {
    const response = await this.client.get<InventoryItemListResponse>(
      '/api/v1/inventory',
      { params },
    );
    return response.data;
  }

  async getInventoryItem(id: string): Promise<InventoryItemDTO> {
    const response = await this.client.get<InventoryItemDTO>(
      `/api/v1/inventory/${id}`,
    );
    return response.data;
  }

  async createInventoryItem(
    data: CreateInventoryItemDTO,
  ): Promise<InventoryItemDTO> {
    const response = await this.client.post<InventoryItemDTO>(
      '/api/v1/inventory',
      data,
    );
    return response.data;
  }

  async updateInventoryItem(
    id: string,
    data: UpdateInventoryItemDTO,
  ): Promise<InventoryItemDTO> {
    const response = await this.client.put<InventoryItemDTO>(
      `/api/v1/inventory/${id}`,
      data,
    );
    return response.data;
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await this.client.delete(`/api/v1/inventory/${id}`);
  }

  async getExpiringItems(days: number = 3): Promise<InventoryItemDTO[]> {
    const response = await this.client.get<InventoryItemDTO[]>(
      '/api/v1/inventory/expiring',
      { params: { days } },
    );
    return response.data;
  }

  // Reference data
  async getCategories(): Promise<CategoryDTO[]> {
    const response = await this.client.get<CategoryDTO[]>('/api/v1/categories');
    return response.data;
  }

  async getStorageLocations(): Promise<StorageLocationDTO[]> {
    const response = await this.client.get<StorageLocationDTO[]>(
      '/api/v1/storage-locations',
    );
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
