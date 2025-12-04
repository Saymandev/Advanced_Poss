import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreatePaymentMethodDto {
  @ApiPropertyOptional({ description: 'Company ID for company-specific payment method' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Branch ID for branch-specific payment method' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ example: 'Cash' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'cash' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'Cash Payment' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'Cash payments accepted at counter' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: [
      'cash',
      'card',
      'mobile_wallet',
      'bank_transfer',
      'due',
      'complimentary',
      'other',
    ],
    example: 'cash',
  })
  @IsOptional()
  @IsEnum([
    'cash',
    'card',
    'mobile_wallet',
    'bank_transfer',
    'due',
    'complimentary',
    'other',
  ])
  type?: string;

  @ApiPropertyOptional({ example: 'cash-icon' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: '#10b981' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresReference?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresAuthorization?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowsPartialPayment?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowsChangeDue?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

