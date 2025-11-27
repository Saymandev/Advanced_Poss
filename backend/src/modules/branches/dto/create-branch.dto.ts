import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 'Downtown Branch' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'downtown-branch' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'http://localhost:3000/company-slug/downtown-branch' })
  @IsOptional()
  @IsString()
  publicUrl?: string;

  @ApiPropertyOptional({ example: '+1234567891' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'downtown@deliciousbites.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    example: {
      street: '456 Park Ave',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      zipCode: '10002',
    },
  })
  @IsObject()
  @IsNotEmpty()
  address: {
    street: string;
    city: string;
    state?: string;
    country: string;
    zipCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  totalTables?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  totalSeats?: number;

  @ApiPropertyOptional({
    example: [
      { day: 'monday', open: '09:00', close: '22:00', isClosed: false },
    ],
  })
  @IsOptional()
  @IsArray()
  openingHours?: Array<{
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }>;
}

