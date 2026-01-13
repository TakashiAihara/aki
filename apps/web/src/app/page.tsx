'use client';

import { useState } from 'react';
import { InventoryList } from '@/components/inventory/InventoryList';
import { InventoryForm } from '@/components/inventory/InventoryForm';
import { Button } from '@/components/ui/Button';
import { InventoryItemDTO } from '@aki/shared';
import { Plus } from 'lucide-react';

export default function HomePage() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItemDTO | undefined>();

  const handleEdit = (item: InventoryItemDTO) => {
    setEditItem(item);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditItem(undefined);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">在庫一覧</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          在庫を追加
        </Button>
      </div>

      <InventoryList onEdit={handleEdit} />

      {showForm && (
        <InventoryForm item={editItem} onClose={handleClose} />
      )}
    </div>
  );
}
