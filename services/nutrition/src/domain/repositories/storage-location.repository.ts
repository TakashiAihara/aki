import { StorageLocation } from '../entities/storage-location.entity';

export interface IStorageLocationRepository {
  findAll(): Promise<StorageLocation[]>;
  findById(id: string): Promise<StorageLocation | null>;
  findByName(name: string): Promise<StorageLocation | null>;
}

export const STORAGE_LOCATION_REPOSITORY = Symbol('IStorageLocationRepository');
