import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSubscriptionFeatureDto {
  @IsString()
  key: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  category: string;

  @IsNumber()
  @Min(0)
  basePriceMonthly: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  basePriceYearly?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  perBranchPriceMonthly?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  perUserPriceMonthly?: number;

  @IsOptional()
  defaultLimits?: {
    maxBranches?: number;
    maxUsers?: number;
    maxMenuItems?: number;
    maxOrders?: number;
    maxTables?: number;
    maxCustomers?: number;
    storageGB?: number;
    allowMultiBranch?: boolean;
    allowAIInsights?: boolean;
    allowAdvancedReports?: boolean;
    allowAPI?: boolean;
    allowWhitelabel?: boolean;
  };

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependencies?: string[];

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateSubscriptionFeatureDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  basePriceMonthly?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  basePriceYearly?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  perBranchPriceMonthly?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  perUserPriceMonthly?: number;

  @IsOptional()
  defaultLimits?: {
    maxBranches?: number;
    maxUsers?: number;
    maxMenuItems?: number;
    maxOrders?: number;
    maxTables?: number;
    maxCustomers?: number;
    storageGB?: number;
    allowMultiBranch?: boolean;
    allowAIInsights?: boolean;
    allowAdvancedReports?: boolean;
    allowAPI?: boolean;
    allowWhitelabel?: boolean;
  };

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependencies?: string[];

  @IsOptional()
  metadata?: Record<string, any>;
}

