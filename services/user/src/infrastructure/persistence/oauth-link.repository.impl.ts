import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthLink, OAuthProvider } from '@domain/entities/oauth-link.entity';
import { OAuthLinkRepository } from '@domain/repositories/oauth-link.repository';

@Injectable()
export class OAuthLinkRepositoryImpl implements OAuthLinkRepository {
  constructor(
    @InjectRepository(OAuthLink)
    private readonly repository: Repository<OAuthLink>,
  ) {}

  async findByProviderAndProviderId(
    provider: OAuthProvider,
    providerUserId: string,
  ): Promise<OAuthLink | null> {
    return this.repository.findOne({
      where: { provider, providerUserId },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<OAuthLink[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async findByUserIdAndProvider(
    userId: string,
    provider: OAuthProvider,
  ): Promise<OAuthLink | null> {
    return this.repository.findOne({
      where: { userId, provider },
    });
  }

  create(data: Partial<OAuthLink>): OAuthLink {
    return this.repository.create(data);
  }

  async save(link: OAuthLink): Promise<OAuthLink> {
    return this.repository.save(link);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.repository.count({
      where: { userId },
    });
  }
}
