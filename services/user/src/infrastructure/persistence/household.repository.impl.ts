import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Household } from '@domain/entities/household.entity';
import { HouseholdMember } from '@domain/entities/household-member.entity';
import { HouseholdInvite } from '@domain/entities/household-invite.entity';
import { HouseholdRepository } from '@domain/repositories/household.repository';

@Injectable()
export class HouseholdRepositoryImpl implements HouseholdRepository {
  constructor(
    @InjectRepository(Household)
    private readonly householdRepo: Repository<Household>,
    @InjectRepository(HouseholdMember)
    private readonly memberRepo: Repository<HouseholdMember>,
    @InjectRepository(HouseholdInvite)
    private readonly inviteRepo: Repository<HouseholdInvite>,
  ) {}

  // Household operations
  async findById(id: string): Promise<Household | null> {
    return this.householdRepo.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });
  }

  async findByOwnerId(ownerId: string): Promise<Household | null> {
    return this.householdRepo.findOne({
      where: { ownerId },
    });
  }

  create(data: Partial<Household>): Household {
    return this.householdRepo.create(data);
  }

  async save(household: Household): Promise<Household> {
    return this.householdRepo.save(household);
  }

  async update(id: string, data: Partial<Household>): Promise<Household> {
    await this.householdRepo.update(id, data as Record<string, unknown>);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Household with id ${id} not found`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.householdRepo.delete(id);
  }

  // Member operations
  async findMemberByUserId(userId: string): Promise<HouseholdMember | null> {
    return this.memberRepo.findOne({
      where: { userId },
      relations: ['household', 'user'],
    });
  }

  async findMembersByHouseholdId(householdId: string): Promise<HouseholdMember[]> {
    return this.memberRepo.find({
      where: { householdId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  createMember(data: Partial<HouseholdMember>): HouseholdMember {
    return this.memberRepo.create(data);
  }

  async saveMember(member: HouseholdMember): Promise<HouseholdMember> {
    return this.memberRepo.save(member);
  }

  async updateMember(id: string, data: Partial<HouseholdMember>): Promise<HouseholdMember> {
    await this.memberRepo.update(id, data as Record<string, unknown>);
    const updated = await this.memberRepo.findOne({ where: { id } });
    if (!updated) {
      throw new Error(`HouseholdMember with id ${id} not found`);
    }
    return updated;
  }

  async deleteMember(id: string): Promise<void> {
    await this.memberRepo.delete(id);
  }

  async deleteMemberByUserId(userId: string): Promise<void> {
    await this.memberRepo.delete({ userId });
  }

  async countMembers(householdId: string): Promise<number> {
    return this.memberRepo.count({ where: { householdId } });
  }

  // Invite operations
  async findInviteByCode(code: string): Promise<HouseholdInvite | null> {
    return this.inviteRepo.findOne({
      where: { code },
      relations: ['household'],
    });
  }

  async findInvitesByHouseholdId(householdId: string): Promise<HouseholdInvite[]> {
    return this.inviteRepo.find({
      where: { householdId },
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveInvitesByHouseholdId(householdId: string): Promise<HouseholdInvite[]> {
    const now = new Date();
    return this.inviteRepo
      .createQueryBuilder('invite')
      .where('invite.householdId = :householdId', { householdId })
      .andWhere('invite.used = false')
      .andWhere('invite.expiresAt > :now', { now })
      .orderBy('invite.createdAt', 'DESC')
      .getMany();
  }

  createInvite(data: Partial<HouseholdInvite>): HouseholdInvite {
    return this.inviteRepo.create(data);
  }

  async saveInvite(invite: HouseholdInvite): Promise<HouseholdInvite> {
    return this.inviteRepo.save(invite);
  }

  async updateInvite(id: string, data: Partial<HouseholdInvite>): Promise<HouseholdInvite> {
    await this.inviteRepo.update(id, data as Record<string, unknown>);
    const updated = await this.inviteRepo.findOne({ where: { id } });
    if (!updated) {
      throw new Error(`HouseholdInvite with id ${id} not found`);
    }
    return updated;
  }

  async deleteInvite(id: string): Promise<void> {
    await this.inviteRepo.delete(id);
  }

  async deleteExpiredInvites(): Promise<number> {
    const result = await this.inviteRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }
}
