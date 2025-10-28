import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'basic' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Basic Plan' })
  @IsString()
  displayName: string;

  @ApiProperty({ example: 'Perfect for small businesses' })
  @IsString()
  description: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 'monthly', enum: ['monthly', 'yearly'] })
  @IsEnum(['monthly', 'yearly'])
  billingCycle: string;

  @ApiProperty({ example: 12 })
  @IsNumber()
  trialPeriod: number;

  @ApiProperty({
    example: {
      pos: true,
      inventory: false,
      crm: false,
      accounting: false,
      aiInsights: false,
      multiBranch: false,
      maxUsers: 2,
      maxBranches: 1,
    },
  })
  @IsObject()
  features: {
    pos: boolean;
    inventory: boolean;
    crm: boolean;
    accounting: boolean;
    aiInsights: boolean;
    multiBranch: boolean;
    maxUsers: number;
    maxBranches: number;
  };

  @ApiProperty({ example: 'price_basic_trial' })
  @IsString()
  stripePriceId: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({
    example: [
      'Unlimited orders & access accounts',
      'Realtime restaurant sales status',
      'Stock, Inventory & Accounting',
    ],
    description: 'List of feature descriptions to display on pricing page',
  })
  @IsOptional()
  featureList?: string[];
}

export class UpdateSubscriptionPlanDto {
  @ApiPropertyOptional({ example: 'Basic Plan' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'Perfect for small businesses' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ example: 'monthly', enum: ['monthly', 'yearly'] })
  @IsOptional()
  @IsEnum(['monthly', 'yearly'])
  billingCycle?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  trialPeriod?: number;

  @ApiPropertyOptional({
    example: {
      pos: true,
      inventory: false,
      crm: false,
      accounting: false,
      aiInsights: false,
      multiBranch: false,
      maxUsers: 2,
      maxBranches: 1,
    },
  })
  @IsOptional()
  @IsObject()
  features?: {
    pos: boolean;
    inventory: boolean;
    crm: boolean;
    accounting: boolean;
    aiInsights: boolean;
    multiBranch: boolean;
    maxUsers: number;
    maxBranches: number;
  };

  @ApiPropertyOptional({ example: 'price_basic_trial' })
  @IsOptional()
  @IsString()
  stripePriceId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({
    example: [
      'Unlimited orders & access accounts',
      'Realtime restaurant sales status',
    ],
    description: 'List of feature descriptions to display on pricing page',
  })
  @IsOptional()
  featureList?: string[];
}
