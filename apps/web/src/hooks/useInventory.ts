'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  CreateInventoryItemDTO,
  UpdateInventoryItemDTO,
  InventoryItemFilter,
} from '@akimi/shared';

export function useInventory(filter?: InventoryItemFilter) {
  return useQuery({
    queryKey: ['inventory', filter],
    queryFn: () => apiClient.listInventory(filter),
  });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: ['inventory', id],
    queryFn: () => apiClient.getInventoryItem(id),
    enabled: !!id,
  });
}

export function useExpiringItems(days: number = 3) {
  return useQuery({
    queryKey: ['inventory', 'expiring', days],
    queryFn: () => apiClient.getExpiringItems(days),
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInventoryItemDTO) => apiClient.createInventoryItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInventoryItemDTO }) =>
      apiClient.updateInventoryItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteInventoryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.getCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useStorageLocations() {
  return useQuery({
    queryKey: ['storage-locations'],
    queryFn: () => apiClient.getStorageLocations(),
    staleTime: 5 * 60 * 1000,
  });
}
