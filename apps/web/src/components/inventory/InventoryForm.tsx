'use client';

import { useState } from 'react';
import { useCategories, useStorageLocations, useCreateInventoryItem, useUpdateInventoryItem } from '@/hooks/useInventory';
import { InventoryItemDTO, CreateInventoryItemDTO } from '@aki/shared';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';

interface InventoryFormProps {
  item?: InventoryItemDTO;
  onClose: () => void;
}

export function InventoryForm({ item, onClose }: InventoryFormProps) {
  const isEdit = !!item;
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useStorageLocations();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();

  const [formData, setFormData] = useState<CreateInventoryItemDTO>({
    name: item?.name || '',
    quantity: item?.quantity || 1,
    unit: item?.unit || '個',
    categoryId: item?.categoryId || (categories[0]?.id ?? ''),
    storageLocationId: item?.storageLocationId || undefined,
    expirationDate: item?.expirationDate || undefined,
    notes: item?.notes || undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEdit && item) {
        await updateItem.mutateAsync({ id: item.id, data: formData });
      } else {
        await createItem.mutateAsync(formData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save item:', error);
    }
  };

  const isPending = createItem.isPending || updateItem.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEdit ? '在庫を編集' : '在庫を追加'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="りんご"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数量 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                単位 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="個, kg, L"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              保管場所
            </label>
            <select
              value={formData.storageLocationId || ''}
              onChange={(e) => setFormData({ ...formData, storageLocationId: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">選択しない</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              期限日
            </label>
            <input
              type="date"
              value={formData.expirationDate || ''}
              onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value || undefined })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="任意のメモ"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? '保存中...' : isEdit ? '更新' : '追加'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
