import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '@domain/entities/category.entity';
import { ICategoryRepository } from '@domain/repositories/category.repository';

@Injectable()
export class CategoryRepositoryImpl implements ICategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.repository.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Category | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Category | null> {
    return this.repository.findOne({ where: { name } });
  }
}
