import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ManualActivationDto {
  @IsNotEmpty()
  @IsString()
  companyId: string;

  @IsNotEmpty()
  @IsString()
  planName: string;

  @IsOptional()
  @IsString()
  billingCycle?: string; // 'monthly', 'quarterly', 'yearly'

  @IsOptional()
  @IsString()
  notes?: string; // Admin notes about the activation
}

