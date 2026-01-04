import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { User } from '@domain/entities/user.entity';
import { UserRepository } from '@domain/repositories/user.repository';

@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['oauthLinks'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      relations: ['oauthLinks'],
    });
  }

  async findByHouseholdId(householdId: string): Promise<User[]> {
    return this.repository.find({
      where: { householdId },
      order: { createdAt: 'ASC' },
    });
  }

  async findPendingDeletion(): Promise<User[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.repository
      .createQueryBuilder('user')
      .where('user.deletionRequestedAt IS NOT NULL')
      .andWhere('user.deletionRequestedAt <= :cutoff', { cutoff: thirtyDaysAgo })
      .getMany();
  }

  create(data: Partial<User>): User {
    return this.repository.create(data);
  }

  async save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`User with id ${id} not found`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { email },
    });
    return count > 0;
  }
}
