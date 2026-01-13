import axios, { AxiosInstance } from 'axios';
import {
  InventoryItemDTO,
  CreateInventoryItemDTO,
  UpdateInventoryItemDTO,
  CategoryDTO,
  StorageLocationDTO,
  InventoryItemListResponse,
  InventoryItemFilter,
} from '@aki/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  setAuthToken(token: string | null): void {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  // Inventory
  async listInventory(params?: InventoryItemFilter): Promise<InventoryItemListResponse> {
    const response = await this.client.get<InventoryItemListResponse>('/api/v1/inventory', {
      params,
    });
    return response.data;
  }

  async getInventoryItem(id: string): Promise<InventoryItemDTO> {
    const response = await this.client.get<InventoryItemDTO>(`/api/v1/inventory/${id}`);
    return response.data;
  }

  async createInventoryItem(data: CreateInventoryItemDTO): Promise<InventoryItemDTO> {
    const response = await this.client.post<InventoryItemDTO>('/api/v1/inventory', data);
    return response.data;
  }

  async updateInventoryItem(id: string, data: UpdateInventoryItemDTO): Promise<InventoryItemDTO> {
    const response = await this.client.put<InventoryItemDTO>(`/api/v1/inventory/${id}`, data);
    return response.data;
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await this.client.delete(`/api/v1/inventory/${id}`);
  }

  async getExpiringItems(days: number = 3): Promise<InventoryItemDTO[]> {
    const response = await this.client.get<InventoryItemDTO[]>('/api/v1/inventory/expiring', {
      params: { days },
    });
    return response.data;
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
}

export const apiClient = new ApiClient();
