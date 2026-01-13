import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtPayload } from '@aki/shared';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CreateInventoryItemDto } from '../dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from '../dto/update-inventory-item.dto';
import { InventoryItemFilterDto } from '../dto/inventory-item-filter.dto';
import {
  InventoryItemResponseDto,
  InventoryItemListResponseDto,
} from '../dto/inventory-item-response.dto';
import { CreateInventoryItemUseCase } from '@application/inventory/create-inventory-item.usecase';
import { GetInventoryItemUseCase } from '@application/inventory/get-inventory-item.usecase';
import { ListInventoryItemsUseCase } from '@application/inventory/list-inventory-items.usecase';
import { UpdateInventoryItemUseCase } from '@application/inventory/update-inventory-item.usecase';
import { DeleteInventoryItemUseCase } from '@application/inventory/delete-inventory-item.usecase';
import { GetExpiringItemsUseCase } from '@application/inventory/get-expiring-items.usecase';

@ApiTags('inventory')
@ApiBearerAuth('bearer')
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly createInventoryItemUseCase: CreateInventoryItemUseCase,
    private readonly getInventoryItemUseCase: GetInventoryItemUseCase,
    private readonly listInventoryItemsUseCase: ListInventoryItemsUseCase,
    private readonly updateInventoryItemUseCase: UpdateInventoryItemUseCase,
    private readonly deleteInventoryItemUseCase: DeleteInventoryItemUseCase,
    private readonly getExpiringItemsUseCase: GetExpiringItemsUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new inventory item' })
  @ApiResponse({
    status: 201,
    description: 'Item created successfully',
    type: InventoryItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() dto: CreateInventoryItemDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryItemResponseDto> {
    const item = await this.createInventoryItemUseCase.execute({
      dto,
      householdId: user.householdId ?? null,
      userId: user.sub,
    });

    return InventoryItemResponseDto.fromEntity(item);
  }

  @Get()
  @ApiOperation({ summary: 'List inventory items' })
  @ApiResponse({
    status: 200,
    description: 'Items retrieved successfully',
    type: InventoryItemListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(
    @Query() filter: InventoryItemFilterDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryItemListResponseDto> {
    const result = await this.listInventoryItemsUseCase.execute({
      filter,
      householdId: user.householdId ?? null,
    });

    return {
      items: result.items.map((item) => InventoryItemResponseDto.fromEntity(item)),
      pagination: {
        cursor: result.cursor,
        hasMore: result.hasMore,
        total: result.total,
      },
    };
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get items expiring soon' })
  @ApiResponse({
    status: 200,
    description: 'Expiring items retrieved successfully',
    type: [InventoryItemResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getExpiring(
    @Query('days') days: number = 3,
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryItemResponseDto[]> {
    const items = await this.getExpiringItemsUseCase.execute({
      householdId: user.householdId ?? null,
      days: days > 0 ? days : 3,
    });

    return items.map((item) => InventoryItemResponseDto.fromEntity(item));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  @ApiParam({ name: 'id', description: 'Item UUID' })
  @ApiResponse({
    status: 200,
    description: 'Item retrieved successfully',
    type: InventoryItemResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryItemResponseDto> {
    const item = await this.getInventoryItemUseCase.execute({
      itemId: id,
      householdId: user.householdId ?? null,
    });

    return InventoryItemResponseDto.fromEntity(item);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update inventory item' })
  @ApiParam({ name: 'id', description: 'Item UUID' })
  @ApiResponse({
    status: 200,
    description: 'Item updated successfully',
    type: InventoryItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryItemDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryItemResponseDto> {
    const item = await this.updateInventoryItemUseCase.execute({
      itemId: id,
      dto,
      householdId: user.householdId ?? null,
      userId: user.sub,
    });

    return InventoryItemResponseDto.fromEntity(item);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete inventory item' })
  @ApiParam({ name: 'id', description: 'Item UUID' })
  @ApiResponse({ status: 204, description: 'Item deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.deleteInventoryItemUseCase.execute({
      itemId: id,
      householdId: user.householdId ?? null,
    });
  }
}
