import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateIngredientDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ example: 'Tomatoes' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'SKU-001' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 'Fresh Roma tomatoes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/tomato.jpg' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    enum: ['food', 'beverage', 'packaging', 'cleaning', 'other'],
    example: 'food',
  })
  @IsEnum(['food', 'beverage', 'packaging', 'cleaning', 'other'])
  category: string;

  @ApiProperty({
    enum: ['kg', 'g', 'l', 'ml', 'pcs', 'box', 'pack', 'bottle', 'can'],
    example: 'kg',
  })
  @IsEnum(['kg', 'g', 'l', 'ml', 'pcs', 'box', 'pack', 'bottle', 'can'])
  unit: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  currentStock: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  minimumStock: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumStock?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderQuantity?: number;

  @ApiProperty({ example: 2.5 })
  @IsNumber()
  @Min(0)
  unitCost: number;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439013' })
  @IsOptional()
  @IsString()
  preferredSupplierId?: string;

  @ApiPropertyOptional({ example: 'Cold Storage' })
  @IsOptional()
  @IsString()
  storageLocation?: string;

  @ApiPropertyOptional({ example: '2-8°C' })
  @IsOptional()
  @IsString()
  storageTemperature?: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shelfLife?: number;

  @ApiPropertyOptional({ example: ['fresh', 'organic'] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ example: 'Store in cool, dry place' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '1234567890123' })
  @IsOptional()
  @IsString()
  barcode?: string;
}

