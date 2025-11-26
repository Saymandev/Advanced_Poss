import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEnum,
    IsMongoId,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class CreateTaxSettingDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 'Sales Tax' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'percentage', enum: ['percentage', 'fixed'] })
  @IsEnum(['percentage', 'fixed'])
  type: 'percentage' | 'fixed';

  @ApiProperty({ example: 7.5 })
  @IsNumber()
  @Min(0)
  @Max(1000)
  rate: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 'all', enum: ['all', 'food', 'beverage', 'alcohol'] })
  @IsEnum(['all', 'food', 'beverage', 'alcohol'])
  appliesTo: 'all' | 'food' | 'beverage' | 'alcohol';
}

