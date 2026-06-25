import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsDateString,
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';
import { IsFutureDateString } from '../../../common/validators/is-future-date.validator';

export class VariantOptionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  priceModifier: number;
}

export class VariantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantOptionDto)
  options: VariantOptionDto[];
}

export class SelectionOptionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;
}

export class SelectionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  type: 'single' | 'multi' | 'optional';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectionOptionDto)
  options: SelectionOptionDto[];
}

export class IngredientItemDto {
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  unit: string;
}

export class AddonDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsBoolean()
  isAvailable: boolean;
}

export class CreateMenuItemDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439013' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 'Grilled Salmon' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Fresh Atlantic salmon grilled to perfection' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '8901234567890' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: 'SKU-00123' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: ['https://example.com/image1.jpg'] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ example: 25.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 12.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ type: () => [VariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];

  @ApiPropertyOptional({ type: () => [AddonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddonDto)
  addons?: AddonDto[];

  @ApiPropertyOptional({ type: () => [SelectionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectionDto)
  selections?: SelectionDto[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ type: () => [IngredientItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientItemDto)
  ingredients?: IngredientItemDto[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  availableFrom?: string;

  @ApiPropertyOptional({ example: '22:00' })
  @IsOptional()
  @IsString()
  availableTo?: string;

  @ApiPropertyOptional({ example: ['monday', 'tuesday', 'wednesday'] })
  @IsOptional()
  @IsArray()
  availableDays?: string[];

  @ApiPropertyOptional({ example: ['spicy', 'healthy', 'vegan'] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  preparationTime?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  requiresKitchen?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    allergens?: string[];
  };

  // Grocery / Shop stock fields
  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumStock?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockAlertThreshold?: number;

  @ApiPropertyOptional({ example: '2027-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  @IsFutureDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'BATCH-2027-1' })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  weightBasedPricing?: boolean;

  @ApiPropertyOptional({ example: 'kg' })
  @IsOptional()
  @IsString()
  unitType?: string;

  @ApiPropertyOptional({ example: 'Rack 3, Shelf A' })
  @IsOptional()
  @IsString()
  storageLocation?: string;
}
