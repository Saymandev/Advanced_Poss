import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SubmitPaymentRequestDto {
  @IsNotEmpty()
  @IsString()
  companyId: string;

  @IsNotEmpty()
  @IsString()
  paymentMethodId: string;

  @IsOptional()
  @IsString()
  planName?: string; // Optional for plan-based subscriptions

  @IsOptional()
  @IsString({ each: true })
  enabledFeatures?: string[]; // Optional for feature-based subscriptions

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  billingCycle?: string;

  @IsNotEmpty()
  @IsString()
  transactionId: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  screenshotUrl?: string; // URL of uploaded payment screenshot
}

