import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { InventoryItemDTO } from '@akimi/shared';

const DAYS_OPTIONS = [
  { label: '1日', value: 1 },
  { label: '3日', value: 3 },
  { label: '7日', value: 7 },
  { label: '14日', value: 14 },
];

export function ExpiringScreen() {
  const [days, setDays] = useState(3);

  const { data: items = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['inventory', 'expiring', days],
    queryFn: () => apiService.getExpiringItems(days),
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP');
  };

  const renderItem = ({ item }: { item: InventoryItemDTO }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemQuantity}>
          {item.quantity} {item.unit}
        </Text>
      </View>
      <View style={styles.dateContainer}>
        <Text style={styles.dateLabel}>期限日</Text>
        <Text style={styles.dateValue}>{formatDate(item.expirationDate)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Days selector */}
      <View style={styles.selectorContainer}>
        {DAYS_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.selectorButton,
              days === option.value && styles.selectorButtonActive,
            ]}
            onPress={() => setDays(option.value)}
          >
            <Text
              style={[
                styles.selectorText,
                days === option.value && styles.selectorTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyText}>
            {days}日以内に期限が切れる在庫はありません
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <Text style={styles.headerText}>
                {items.length}件の在庫が{days}日以内に期限を迎えます
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectorButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  selectorButtonActive: {
    backgroundColor: '#22c55e',
  },
  selectorText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectorTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  headerContainer: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  headerText: {
    color: '#92400e',
    fontWeight: '500',
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6b7280',
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d97706',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    color: '#22c55e',
    marginBottom: 16,
  },
  emptyText: {
    color: '#16a34a',
    fontSize: 16,
    textAlign: 'center',
  },
});
