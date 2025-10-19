import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

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

  @ApiPropertyOptional({
    example: [
      {
        name: 'Size',
        options: [
          { name: 'Regular', priceModifier: 0 },
          { name: 'Large', priceModifier: 5.00 },
        ],
      },
    ],
  })
  @IsOptional()
  @IsArray()
  variants?: Array<{
    name: string;
    options: Array<{
      name: string;
      priceModifier: number;
    }>;
  }>;

  @ApiPropertyOptional({
    example: [{ name: 'Extra Sauce', price: 2.00, isAvailable: true }],
  })
  @IsOptional()
  @IsArray()
  addons?: Array<{
    name: string;
    price: number;
    isAvailable: boolean;
  }>;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({
    example: [
      { ingredientId: '507f1f77bcf86cd799439014', quantity: 0.25, unit: 'kg' },
    ],
  })
  @IsOptional()
  @IsArray()
  ingredients?: Array<{
    ingredientId: string;
    quantity: number;
    unit: string;
  }>;

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

  @ApiPropertyOptional({
    example: {
      calories: 450,
      protein: 35,
      carbs: 20,
      fat: 25,
      allergens: ['fish'],
    },
  })
  @IsOptional()
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    allergens?: string[];
  };
}

