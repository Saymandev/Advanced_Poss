import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MinLength,
    MaxLength,
} from 'class-validator';
import { DEFAULT_CATEGORY_TYPE } from '../constants/category-types.constant';

export class CreateCategoryDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ example: 'Main Courses' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Delicious main course dishes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: 'utensils' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: '#FF6B6B' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ 
    example: DEFAULT_CATEGORY_TYPE,
    description: 'Category type - can be any custom value (e.g., "food", "beverage", "appetizer", "custom-type")'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  type: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

