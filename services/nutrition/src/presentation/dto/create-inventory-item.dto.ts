import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsUUID,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateInventoryItemDto {
  @ApiProperty({
    description: 'Item name',
    example: 'りんご',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    description: 'Quantity of the item',
    example: 5,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  quantity!: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: '個',
    minLength: 1,
    maxLength: 20,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  unit!: string;

  @ApiPropertyOptional({
    description: 'Expiration date (ISO 8601 format)',
    example: '2025-01-15',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  expirationDate?: string | null;

  @ApiProperty({
    description: 'Category UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional({
    description: 'Storage location UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  storageLocationId?: string | null;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: '青森産',
    maxLength: 1000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
