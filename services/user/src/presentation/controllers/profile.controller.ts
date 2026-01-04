import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtPayload } from '@akimi/shared';
import { ProfileService } from '@application/profile/profile.service';
import {
  ProfileResponseDto,
  UpdateProfileRequestDto,
  OAuthLinkResponseDto,
} from '../dto/profile.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve the authenticated user\'s profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getProfile(@CurrentUser() user: JwtPayload): Promise<ProfileResponseDto> {
    const profile = await this.profileService.getProfile(user.sub);

    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      householdId: profile.householdId,
      notificationPreferences: profile.notificationPreferences,
      createdAt: profile.createdAt,
      deletionRequestedAt: profile.deletionRequestedAt,
    };
  }

  @Patch()
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Update the authenticated user\'s profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() updateData: UpdateProfileRequestDto,
  ): Promise<ProfileResponseDto> {
    const profile = await this.profileService.updateProfile(user.sub, {
      displayName: updateData.displayName,
      avatarUrl: updateData.avatarUrl,
      notificationPreferences: updateData.notificationPreferences,
    });

    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      householdId: profile.householdId,
      notificationPreferences: profile.notificationPreferences,
      createdAt: profile.createdAt,
      deletionRequestedAt: profile.deletionRequestedAt,
    };
  }

  @Get('oauth-links')
  @ApiOperation({
    summary: 'Get linked OAuth accounts',
    description: 'Retrieve list of OAuth providers linked to the user\'s account',
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth links retrieved successfully',
    type: [OAuthLinkResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getOAuthLinks(
    @CurrentUser() user: JwtPayload,
  ): Promise<OAuthLinkResponseDto[]> {
    const links = await this.profileService.getOAuthLinks(user.sub);

    return links.map(link => ({
      provider: link.provider,
      email: link.email,
      linkedAt: link.linkedAt,
    }));
  }
}
