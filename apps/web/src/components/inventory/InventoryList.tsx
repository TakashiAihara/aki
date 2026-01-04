'use client';

import { useState } from 'react';
import { useInventory, useDeleteInventoryItem } from '@/hooks/useInventory';
import { InventoryItemDTO, ExpirationStatus, getExpirationStatus } from '@akimi/shared';
import { formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Trash2, Edit, AlertTriangle, Package } from 'lucide-react';

interface InventoryListProps {
  onEdit?: (item: InventoryItemDTO) => void;
}

export function InventoryList({ onEdit }: InventoryListProps) {
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useInventory({ search: search || undefined });
  const deleteItem = useDeleteInventoryItem();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        エラーが発生しました: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  const items = data?.items || [];

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="在庫を検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Package className="mx-auto h-12 w-12 mb-4" />
          <p>在庫がありません</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名前
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  数量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  カテゴリ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  期限
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状態
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <InventoryRow
                  key={item.id}
                  item={item}
                  onEdit={onEdit}
                  onDelete={() => deleteItem.mutate(item.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InventoryRow({
  item,
  onEdit,
  onDelete,
}: {
  item: InventoryItemDTO;
  onEdit?: (item: InventoryItemDTO) => void;
  onDelete: () => void;
}) {
  const status = getExpirationStatus(item.expirationDate);

  const statusBadge = {
    [ExpirationStatus.EXPIRED]: (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <AlertTriangle className="w-3 h-3 mr-1" />
        期限切れ
      </span>
    ),
    [ExpirationStatus.EXPIRING_SOON]: (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        まもなく期限
      </span>
    ),
    [ExpirationStatus.FRESH]: (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        新鮮
      </span>
    ),
    [ExpirationStatus.NONE]: (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        -
      </span>
    ),
  };

  const categoryName = typeof item.category === 'object' ? item.category.name : '-';

  return (
    <tr className={cn(item.isDepleted && 'opacity-50')}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{item.name}</div>
        {item.notes && (
          <div className="text-sm text-gray-500 truncate max-w-xs">{item.notes}</div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {item.quantity} {item.unit}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {categoryName}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDate(item.expirationDate)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">{statusBadge[status]}</td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit?.(item)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
