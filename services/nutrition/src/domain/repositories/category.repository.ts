import { Category } from '../entities/category.entity';

export interface ICategoryRepository {
  findAll(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
}

export const CATEGORY_REPOSITORY = Symbol('ICategoryRepository');
