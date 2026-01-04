import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageLocation } from '@domain/entities/storage-location.entity';
import { IStorageLocationRepository } from '@domain/repositories/storage-location.repository';

@Injectable()
export class StorageLocationRepositoryImpl implements IStorageLocationRepository {
  constructor(
    @InjectRepository(StorageLocation)
    private readonly repository: Repository<StorageLocation>,
  ) {}

  async findAll(): Promise<StorageLocation[]> {
    return this.repository.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findById(id: string): Promise<StorageLocation | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<StorageLocation | null> {
    return this.repository.findOne({ where: { name } });
  }
}
