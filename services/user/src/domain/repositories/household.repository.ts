import { Household } from '../entities/household.entity';
import { HouseholdMember } from '../entities/household-member.entity';
import { HouseholdInvite } from '../entities/household-invite.entity';

/**
 * Repository interface for Household entity operations
 */
export interface HouseholdRepository {
  // Household operations
  findById(id: string): Promise<Household | null>;
  findByOwnerId(ownerId: string): Promise<Household | null>;
  create(data: Partial<Household>): Household;
  save(household: Household): Promise<Household>;
  update(id: string, data: Partial<Household>): Promise<Household>;
  delete(id: string): Promise<void>;

  // Member operations
  findMemberByUserId(userId: string): Promise<HouseholdMember | null>;
  findMembersByHouseholdId(householdId: string): Promise<HouseholdMember[]>;
  createMember(data: Partial<HouseholdMember>): HouseholdMember;
  saveMember(member: HouseholdMember): Promise<HouseholdMember>;
  updateMember(id: string, data: Partial<HouseholdMember>): Promise<HouseholdMember>;
  deleteMember(id: string): Promise<void>;
  deleteMemberByUserId(userId: string): Promise<void>;
  countMembers(householdId: string): Promise<number>;

  // Invite operations
  findInviteByCode(code: string): Promise<HouseholdInvite | null>;
  findInvitesByHouseholdId(householdId: string): Promise<HouseholdInvite[]>;
  findActiveInvitesByHouseholdId(householdId: string): Promise<HouseholdInvite[]>;
  createInvite(data: Partial<HouseholdInvite>): HouseholdInvite;
  saveInvite(invite: HouseholdInvite): Promise<HouseholdInvite>;
  updateInvite(id: string, data: Partial<HouseholdInvite>): Promise<HouseholdInvite>;
  deleteInvite(id: string): Promise<void>;
  deleteExpiredInvites(): Promise<number>;
}

export const HOUSEHOLD_REPOSITORY = 'HouseholdRepository';
