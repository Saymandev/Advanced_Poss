import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: '101' })
  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @ApiProperty({ example: 'double', enum: ['single', 'double', 'suite', 'deluxe', 'presidential'] })
  @IsEnum(['single', 'double', 'suite', 'deluxe', 'presidential'])
  @IsNotEmpty()
  roomType: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  floor?: number;

  @ApiPropertyOptional({ example: 'Main Building' })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiPropertyOptional({ example: 'A comfortable double room with modern amenities' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  maxOccupancy: number;

  @ApiPropertyOptional({
    example: { single: 0, double: 1, king: 0 },
  })
  @IsOptional()
  beds?: {
    single: number;
    double: number;
    king: number;
  };

  @ApiPropertyOptional({ example: ['wifi', 'tv', 'ac', 'minibar'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({
    example: [
      {
        startDate: '2024-12-01',
        endDate: '2024-12-31',
        price: 7000,
      },
    ],
  })
  @IsOptional()
  seasonalPricing?: {
    startDate: Date;
    endDate: Date;
    price: number;
  }[];

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiPropertyOptional({ example: 'ocean' })
  @IsOptional()
  @IsString()
  view?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  smokingAllowed?: boolean;

  @ApiPropertyOptional({ example: ['https://example.com/room1.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

