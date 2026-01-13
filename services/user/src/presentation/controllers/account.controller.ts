/**
 * Account Controller
 *
 * Handles account management endpoints including GDPR deletion.
 */

import {
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtPayload } from '@aki/shared';
import { AccountDeletionService } from '@application/account/account-deletion.service';
import {
  DeletionRequestResponseDto,
  DeletionCancelResponseDto,
  AccountStatusResponseDto,
} from '../dto/account.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { USER_REPOSITORY, UserRepository } from '@domain/repositories/user.repository';
import { Inject } from '@nestjs/common';
import { UserStatus } from '@domain/entities/user.entity';

@ApiTags('account')
@Controller('account')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountController {
  constructor(
    private readonly accountDeletionService: AccountDeletionService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get account status',
    description: 'Get current account status including deletion status',
  })
  @ApiResponse({
    status: 200,
    description: 'Account status retrieved',
    type: AccountStatusResponseDto,
  })
  async getAccountStatus(
    @CurrentUser() user: JwtPayload,
  ): Promise<AccountStatusResponseDto> {
    const fullUser = await this.userRepository.findById(user.sub);

    if (!fullUser) {
      return {
        status: 'active',
        deletionScheduledAt: null,
        daysUntilDeletion: null,
      };
    }

    let daysUntilDeletion: number | null = null;
    if (fullUser.deletionScheduledAt) {
      const now = new Date();
      const scheduledDate = new Date(fullUser.deletionScheduledAt);
      const diffTime = scheduledDate.getTime() - now.getTime();
      daysUntilDeletion = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      status: fullUser.status === UserStatus.PENDING_DELETION ? 'pending_deletion' : 'active',
      deletionScheduledAt: fullUser.deletionScheduledAt || null,
      daysUntilDeletion,
    };
  }

  @Post('delete')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request account deletion',
    description: 'Request account deletion with 30-day grace period (GDPR compliant)',
  })
  @ApiResponse({
    status: 202,
    description: 'Deletion request accepted',
    type: DeletionRequestResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 409,
    description: 'Account is already scheduled for deletion',
  })
  async requestDeletion(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<DeletionRequestResponseDto> {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    return this.accountDeletionService.requestDeletion(
      user.sub,
      ipAddress,
      userAgent,
    );
  }

  @Post('delete/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel account deletion',
    description: 'Cancel a pending account deletion request',
  })
  @ApiResponse({
    status: 200,
    description: 'Deletion cancelled successfully',
    type: DeletionCancelResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 409,
    description: 'Account is not scheduled for deletion',
  })
  async cancelDeletion(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<DeletionCancelResponseDto> {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    return this.accountDeletionService.cancelDeletion(
      user.sub,
      ipAddress,
      userAgent,
    );
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
