import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtPayload, SyncRequest, SyncResponse } from '@akimi/shared';
import { CurrentUser } from '../decorators/current-user.decorator';
import { SyncUseCase } from '@application/sync/sync.usecase';

@ApiTags('sync')
@ApiBearerAuth('bearer')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncUseCase: SyncUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Sync offline changes' })
  @ApiResponse({
    status: 200,
    description: 'Sync completed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sync(
    @Body() request: SyncRequest,
    @CurrentUser() user: JwtPayload,
  ): Promise<SyncResponse> {
    return this.syncUseCase.execute({
      request,
      householdId: user.householdId ?? null,
      userId: user.sub,
    });
  }
}
