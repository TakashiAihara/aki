import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  HouseholdInfo,
  HouseholdMemberInfo,
  HouseholdInviteInfo,
} from '@aki/shared';
import { HouseholdRepository, HOUSEHOLD_REPOSITORY } from '@domain/repositories/household.repository';
import { UserRepository, USER_REPOSITORY } from '@domain/repositories/user.repository';
import { HouseholdRole } from '@domain/entities/household-member.entity';

// Characters for invite code generation (no ambiguous chars: 0/O, 1/I/l)
const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 8;
const INVITE_EXPIRY_HOURS = 48;

@Injectable()
export class HouseholdService {
  constructor(
    @Inject(HOUSEHOLD_REPOSITORY)
    private readonly householdRepository: HouseholdRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async createHousehold(
    userId: string,
    name: string,
  ): Promise<HouseholdInfo> {
    // Check if user is already in a household
    const existingMembership = await this.householdRepository.findMemberByUserId(userId);
    if (existingMembership) {
      throw new ConflictException('User is already a member of a household');
    }

    // Validate name
    this.validateHouseholdName(name);

    // Create household
    const household = this.householdRepository.create({
      name,
      ownerId: userId,
    });
    const savedHousehold = await this.householdRepository.save(household);

    // Add creator as owner member
    const member = this.householdRepository.createMember({
      householdId: savedHousehold.id,
      userId,
      role: HouseholdRole.OWNER,
    });
    await this.householdRepository.saveMember(member);

    // Update user's householdId
    await this.userRepository.update(userId, { householdId: savedHousehold.id });

    return this.toHouseholdInfo(savedHousehold, 1);
  }

  async getHousehold(householdId: string): Promise<HouseholdInfo> {
    const household = await this.householdRepository.findById(householdId);
    if (!household) {
      throw new NotFoundException('Household not found');
    }

    const memberCount = await this.householdRepository.countMembers(householdId);
    return this.toHouseholdInfo(household, memberCount);
  }

  async getHouseholdMembers(householdId: string): Promise<HouseholdMemberInfo[]> {
    const members = await this.householdRepository.findMembersByHouseholdId(householdId);
    return members.map(member => ({
      userId: member.userId,
      displayName: member.user?.displayName || 'Unknown',
      avatarUrl: member.user?.avatarUrl ?? null,
      role: member.role as 'owner' | 'member',
      joinedAt: member.joinedAt,
    }));
  }

  async joinHousehold(
    userId: string,
    inviteCode: string,
  ): Promise<HouseholdInfo> {
    // Check if user is already in a household
    const existingMembership = await this.householdRepository.findMemberByUserId(userId);
    if (existingMembership) {
      throw new ConflictException('User is already a member of a household');
    }

    // Find and validate invite
    const invite = await this.householdRepository.findInviteByCode(inviteCode.toUpperCase());
    if (!invite) {
      throw new NotFoundException('Invalid invite code');
    }

    if (!invite.isValid()) {
      throw new BadRequestException('Invite code has expired or already been used');
    }

    // Add user as member
    const member = this.householdRepository.createMember({
      householdId: invite.householdId,
      userId,
      role: HouseholdRole.MEMBER,
    });
    await this.householdRepository.saveMember(member);

    // Mark invite as used
    await this.householdRepository.updateInvite(invite.id, {
      used: true,
      usedBy: userId,
      usedAt: new Date(),
    });

    // Update user's householdId
    await this.userRepository.update(userId, { householdId: invite.householdId });

    const household = await this.householdRepository.findById(invite.householdId);
    const memberCount = await this.householdRepository.countMembers(invite.householdId);

    return this.toHouseholdInfo(household!, memberCount);
  }

  async leaveHousehold(userId: string): Promise<void> {
    const membership = await this.householdRepository.findMemberByUserId(userId);
    if (!membership) {
      throw new NotFoundException('User is not a member of any household');
    }

    // If user is owner, transfer ownership first
    if (membership.role === HouseholdRole.OWNER) {
      const members = await this.householdRepository.findMembersByHouseholdId(
        membership.householdId,
      );

      if (members.length === 1) {
        // Last member - delete the household
        await this.householdRepository.delete(membership.householdId);
        await this.userRepository.update(userId, { householdId: null });
        return;
      }

      // Transfer to next member
      const nextOwner = members.find(m => m.userId !== userId);
      if (nextOwner) {
        await this.transferOwnership(userId, nextOwner.userId);
      }
    }

    // Remove membership
    await this.householdRepository.deleteMemberByUserId(userId);
    await this.userRepository.update(userId, { householdId: null });
  }

  async createInvite(
    userId: string,
    householdId: string,
  ): Promise<HouseholdInviteInfo> {
    // Verify user is a member
    const membership = await this.householdRepository.findMemberByUserId(userId);
    if (!membership || membership.householdId !== householdId) {
      throw new ForbiddenException('User is not a member of this household');
    }

    // Generate unique invite code
    const code = await this.generateInviteCode();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + INVITE_EXPIRY_HOURS);

    const invite = this.householdRepository.createInvite({
      householdId,
      code,
      createdBy: userId,
      expiresAt,
    });

    const savedInvite = await this.householdRepository.saveInvite(invite);

    return {
      code: savedInvite.code,
      expiresAt: savedInvite.expiresAt,
      createdAt: savedInvite.createdAt,
      createdBy: savedInvite.createdBy,
      used: savedInvite.used,
    };
  }

  async transferOwnership(
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<void> {
    const currentOwnerMembership = await this.householdRepository.findMemberByUserId(
      currentOwnerId,
    );

    if (!currentOwnerMembership || currentOwnerMembership.role !== HouseholdRole.OWNER) {
      throw new ForbiddenException('Only the owner can transfer ownership');
    }

    const newOwnerMembership = await this.householdRepository.findMemberByUserId(newOwnerId);
    if (
      !newOwnerMembership ||
      newOwnerMembership.householdId !== currentOwnerMembership.householdId
    ) {
      throw new BadRequestException('New owner must be a member of the household');
    }

    // Update roles
    await this.householdRepository.updateMember(currentOwnerMembership.id, {
      role: HouseholdRole.MEMBER,
    });
    await this.householdRepository.updateMember(newOwnerMembership.id, {
      role: HouseholdRole.OWNER,
    });

    // Update household owner
    await this.householdRepository.update(currentOwnerMembership.householdId, {
      ownerId: newOwnerId,
    });
  }

  async removeMember(
    ownerId: string,
    memberUserId: string,
  ): Promise<void> {
    const ownerMembership = await this.householdRepository.findMemberByUserId(ownerId);
    if (!ownerMembership || ownerMembership.role !== HouseholdRole.OWNER) {
      throw new ForbiddenException('Only the owner can remove members');
    }

    if (ownerId === memberUserId) {
      throw new BadRequestException('Owner cannot remove themselves. Use leave or transfer ownership.');
    }

    const targetMembership = await this.householdRepository.findMemberByUserId(memberUserId);
    if (
      !targetMembership ||
      targetMembership.householdId !== ownerMembership.householdId
    ) {
      throw new NotFoundException('Member not found in this household');
    }

    await this.householdRepository.deleteMember(targetMembership.id);
    await this.userRepository.update(memberUserId, { householdId: null });
  }

  async updateHouseholdName(
    userId: string,
    householdId: string,
    name: string,
  ): Promise<HouseholdInfo> {
    const membership = await this.householdRepository.findMemberByUserId(userId);
    if (!membership || membership.householdId !== householdId) {
      throw new ForbiddenException('User is not a member of this household');
    }

    if (membership.role !== HouseholdRole.OWNER) {
      throw new ForbiddenException('Only the owner can update household name');
    }

    this.validateHouseholdName(name);

    const updated = await this.householdRepository.update(householdId, { name });
    const memberCount = await this.householdRepository.countMembers(householdId);

    return this.toHouseholdInfo(updated, memberCount);
  }

  private async generateInviteCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = '';
      for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
        code += INVITE_CODE_CHARS.charAt(
          Math.floor(Math.random() * INVITE_CODE_CHARS.length),
        );
      }

      // Format as XXXX-XXXX for readability
      code = `${code.slice(0, 4)}-${code.slice(4)}`;

      // Check if code already exists
      const existing = await this.householdRepository.findInviteByCode(code.replace('-', ''));
      if (!existing) {
        return code.replace('-', ''); // Store without hyphen
      }

      attempts++;
    } while (attempts < maxAttempts);

    throw new Error('Failed to generate unique invite code');
  }

  private validateHouseholdName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Household name cannot be empty');
    }

    if (name.length > 100) {
      throw new BadRequestException('Household name cannot exceed 100 characters');
    }
  }

  private toHouseholdInfo(
    household: { id: string; name: string; ownerId: string; createdAt: Date },
    memberCount: number,
  ): HouseholdInfo {
    return {
      id: household.id,
      name: household.name,
      ownerId: household.ownerId,
      memberCount,
      createdAt: household.createdAt,
    };
  }
}
