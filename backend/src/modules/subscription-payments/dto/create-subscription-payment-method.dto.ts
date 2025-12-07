import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { PaymentGateway, PaymentMethodType } from '../schemas/subscription-payment-method.schema';

export class CreateSubscriptionPaymentMethodDto {
  @IsNotEmpty()
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @IsNotEmpty()
  @IsEnum(PaymentMethodType)
  type: PaymentMethodType;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedCountries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedCurrencies?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  config?: {
    apiKey?: string;
    secretKey?: string;
    merchantId?: string;
    accountNumber?: string;
    webhookUrl?: string;
    [key: string]: any;
  };

  @IsOptional()
  @IsObject()
  metadata?: {
    minAmount?: number;
    maxAmount?: number;
    processingFee?: number;
    processingFeeType?: 'fixed' | 'percentage';
    [key: string]: any;
  };
}

