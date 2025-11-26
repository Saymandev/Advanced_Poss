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

export class CreateServiceChargeSettingDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 'Dine-in Service Charge' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 'dine_in', enum: ['all', 'dine_in', 'takeout', 'delivery'] })
  @IsEnum(['all', 'dine_in', 'takeout', 'delivery'])
  appliesTo: 'all' | 'dine_in' | 'takeout' | 'delivery';
}

