import { InventoryItemDTO } from '@aki/shared';

export type RootStackParamList = {
  Main: undefined;
  ItemDetail: { item: InventoryItemDTO };
  AddItem: undefined;
  EditItem: { item: InventoryItemDTO };
};

export type MainTabParamList = {
  Inventory: undefined;
  Expiring: undefined;
  Settings: undefined;
};
