import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import {
  IStorageLocationRepository,
  STORAGE_LOCATION_REPOSITORY,
} from '@domain/repositories/storage-location.repository';
import { StorageLocationResponseDto } from '../dto/inventory-item-response.dto';

@ApiTags('storage-locations')
@ApiBearerAuth('bearer')
@Controller('storage-locations')
export class StorageLocationController {
  constructor(
    @Inject(STORAGE_LOCATION_REPOSITORY)
    private readonly storageLocationRepository: IStorageLocationRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all storage locations' })
  @ApiResponse({
    status: 200,
    description: 'Storage locations retrieved successfully',
    type: [StorageLocationResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(): Promise<StorageLocationResponseDto[]> {
    const locations = await this.storageLocationRepository.findAll();
    return locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      sortOrder: loc.sortOrder,
    }));
  }
}
