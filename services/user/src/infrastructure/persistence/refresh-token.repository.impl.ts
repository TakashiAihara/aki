import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { RefreshToken } from '@domain/entities/refresh-token.entity';
import { RefreshTokenRepository } from '@domain/repositories/refresh-token.repository';

@Injectable()
export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repository: Repository<RefreshToken>,
  ) {}

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<RefreshToken[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveByUserId(userId: string): Promise<RefreshToken[]> {
    const now = new Date();

    return this.repository
      .createQueryBuilder('token')
      .where('token.userId = :userId', { userId })
      .andWhere('token.revokedAt IS NULL')
      .andWhere('token.expiresAt > :now', { now })
      .orderBy('token.createdAt', 'DESC')
      .getMany();
  }

  create(data: Partial<RefreshToken>): RefreshToken {
    return this.repository.create(data);
  }

  async save(token: RefreshToken): Promise<RefreshToken> {
    return this.repository.save(token);
  }

  async update(id: string, data: Partial<RefreshToken>): Promise<RefreshToken> {
    await this.repository.update(id, data as Record<string, unknown>);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw new Error(`RefreshToken with id ${id} not found`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }

  async revokeByHash(tokenHash: string): Promise<boolean> {
    const result = await this.repository.update(
      { tokenHash, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    return (result.affected ?? 0) > 0;
  }

  async revokeAllByUserId(userId: string): Promise<number> {
    const result = await this.repository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    return result.affected ?? 0;
  }
}
