import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateDeliveryZoneDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ example: 'Downtown Zone' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Delivery to downtown area' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  deliveryCharge: number;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minimumOrderAmount?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  freeDeliveryAbove?: number;

  @ApiPropertyOptional({
    example: {
      type: 'radius',
      coordinates: [23.8103, 90.4125],
      radius: 5000,
    },
  })
  @IsObject()
  @IsOptional()
  coverageArea?: {
    type: 'polygon' | 'radius';
    coordinates?: number[][];
    radius?: number;
  };

  @ApiPropertyOptional({ example: ['Downtown', 'Central Business District'] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  areas?: string[];

  @ApiPropertyOptional({
    example: {
      zipCodes: ['10001', '10002'],
      neighborhoods: ['Downtown', 'Midtown'],
      landmarks: ['Times Square', 'Central Park'],
    },
  })
  @IsObject()
  @IsOptional()
  deliveryAreas?: {
    zipCodes?: string[];
    neighborhoods?: string[];
    landmarks?: string[];
  };

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

