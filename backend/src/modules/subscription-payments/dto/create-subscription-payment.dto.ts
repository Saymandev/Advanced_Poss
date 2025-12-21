import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PaymentGateway } from '../schemas/subscription-payment-method.schema';

export class PaymentDetailsDto {
  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string; // For mobile wallets

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateSubscriptionPaymentDto {
  @IsNotEmpty()
  @IsString()
  companyId: string;

  @IsNotEmpty()
  @IsString()
  planName: string;

  @IsNotEmpty()
  @IsEnum(PaymentGateway)
  paymentGateway: PaymentGateway;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  paymentDetails?: PaymentDetailsDto;

  @IsOptional()
  @IsString()
  billingCycle?: string; // 'monthly', 'quarterly', 'yearly'

  @IsOptional()
  @IsString()
  paymentMethodId?: string; // Specific payment method ID (required for MANUAL gateway)
}

