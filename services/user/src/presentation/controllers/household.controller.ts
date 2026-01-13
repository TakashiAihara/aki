import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtPayload } from '@aki/shared';
import { HouseholdService } from '@application/household/household.service';
import {
  CreateHouseholdRequestDto,
  JoinHouseholdRequestDto,
  UpdateHouseholdRequestDto,
  TransferOwnershipRequestDto,
  HouseholdResponseDto,
  HouseholdMemberResponseDto,
  HouseholdInviteResponseDto,
} from '../dto/household.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('household')
@Controller('household')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HouseholdController {
  constructor(private readonly householdService: HouseholdService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new household',
    description: 'Create a new household and become its owner',
  })
  @ApiResponse({
    status: 201,
    description: 'Household created successfully',
    type: HouseholdResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
  })
  @ApiResponse({
    status: 409,
    description: 'User is already in a household',
  })
  async createHousehold(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateHouseholdRequestDto,
  ): Promise<HouseholdResponseDto> {
    return this.householdService.createHousehold(user.sub, body.name);
  }

  @Get()
  @ApiOperation({
    summary: 'Get current user\'s household',
    description: 'Get the household the authenticated user belongs to',
  })
  @ApiResponse({
    status: 200,
    description: 'Household retrieved successfully',
    type: HouseholdResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User is not in a household',
  })
  async getHousehold(
    @CurrentUser() user: JwtPayload,
  ): Promise<HouseholdResponseDto> {
    if (!user.householdId) {
      throw new Error('User is not in a household');
    }
    return this.householdService.getHousehold(user.householdId);
  }

  @Get('members')
  @ApiOperation({
    summary: 'Get household members',
    description: 'Get list of members in the current user\'s household',
  })
  @ApiResponse({
    status: 200,
    description: 'Members retrieved successfully',
    type: [HouseholdMemberResponseDto],
  })
  async getMembers(
    @CurrentUser() user: JwtPayload,
  ): Promise<HouseholdMemberResponseDto[]> {
    if (!user.householdId) {
      throw new Error('User is not in a household');
    }
    return this.householdService.getHouseholdMembers(user.householdId);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Join a household',
    description: 'Join a household using an invite code',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully joined household',
    type: HouseholdResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired invite code',
  })
  @ApiResponse({
    status: 409,
    description: 'User is already in a household',
  })
  async joinHousehold(
    @CurrentUser() user: JwtPayload,
    @Body() body: JoinHouseholdRequestDto,
  ): Promise<HouseholdResponseDto> {
    return this.householdService.joinHousehold(user.sub, body.code);
  }

  @Post('leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Leave current household',
    description: 'Leave the household. If owner, ownership is transferred.',
  })
  @ApiResponse({
    status: 204,
    description: 'Successfully left household',
  })
  @ApiResponse({
    status: 404,
    description: 'User is not in a household',
  })
  async leaveHousehold(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.householdService.leaveHousehold(user.sub);
  }

  @Post('invites')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an invite code',
    description: 'Generate a new invite code for the household',
  })
  @ApiResponse({
    status: 201,
    description: 'Invite created successfully',
    type: HouseholdInviteResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'User is not a member of a household',
  })
  async createInvite(
    @CurrentUser() user: JwtPayload,
  ): Promise<HouseholdInviteResponseDto> {
    if (!user.householdId) {
      throw new Error('User is not in a household');
    }
    return this.householdService.createInvite(user.sub, user.householdId);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update household',
    description: 'Update household name (owner only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Household updated successfully',
    type: HouseholdResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Only owner can update household',
  })
  async updateHousehold(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateHouseholdRequestDto,
  ): Promise<HouseholdResponseDto> {
    if (!user.householdId) {
      throw new Error('User is not in a household');
    }
    return this.householdService.updateHouseholdName(
      user.sub,
      user.householdId,
      body.name,
    );
  }

  @Post('transfer-ownership')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Transfer ownership',
    description: 'Transfer household ownership to another member (owner only)',
  })
  @ApiResponse({
    status: 204,
    description: 'Ownership transferred successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'New owner must be a member',
  })
  @ApiResponse({
    status: 403,
    description: 'Only owner can transfer ownership',
  })
  async transferOwnership(
    @CurrentUser() user: JwtPayload,
    @Body() body: TransferOwnershipRequestDto,
  ): Promise<void> {
    await this.householdService.transferOwnership(user.sub, body.newOwnerId);
  }

  @Delete('members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a member',
    description: 'Remove a member from the household (owner only)',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID of the member to remove',
  })
  @ApiResponse({
    status: 204,
    description: 'Member removed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot remove yourself',
  })
  @ApiResponse({
    status: 403,
    description: 'Only owner can remove members',
  })
  @ApiResponse({
    status: 404,
    description: 'Member not found',
  })
  async removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('userId') memberUserId: string,
  ): Promise<void> {
    await this.householdService.removeMember(user.sub, memberUserId);
  }
}
