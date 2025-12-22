import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ManualActivationDto {
  @IsNotEmpty()
  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  planName?: string; // Optional for plan-based subscriptions

  @IsOptional()
  @IsString({ each: true })
  enabledFeatures?: string[]; // Optional for feature-based subscriptions

  @IsOptional()
  @IsString()
  billingCycle?: string; // 'monthly', 'quarterly', 'yearly'

  @IsOptional()
  @IsString()
  notes?: string; // Admin notes about the activation
}

