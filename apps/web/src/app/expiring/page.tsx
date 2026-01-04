'use client';

import { useState } from 'react';
import { useExpiringItems } from '@/hooks/useInventory';
import { formatDate } from '@/lib/utils';
import { AlertTriangle, Clock } from 'lucide-react';

export default function ExpiringPage() {
  const [days, setDays] = useState(3);
  const { data: items = [], isLoading, error } = useExpiringItems(days);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-900">期限切れ間近</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">表示期間:</span>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={1}>1日以内</option>
            <option value={3}>3日以内</option>
            <option value={7}>7日以内</option>
            <option value={14}>14日以内</option>
            <option value={30}>30日以内</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          エラーが発生しました
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-green-50 rounded-lg">
          <Clock className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <p className="text-green-700 font-medium">
            {days}日以内に期限が切れる在庫はありません
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-100">
            <p className="text-yellow-800 font-medium">
              {items.length}件の在庫が{days}日以内に期限を迎えます
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {items.map((item) => (
              <li key={item.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.quantity} {item.unit} •{' '}
                    {typeof item.category === 'object' ? item.category.name : '-'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-yellow-600">
                    {formatDate(item.expirationDate)}
                  </p>
                  <p className="text-xs text-gray-500">期限日</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
