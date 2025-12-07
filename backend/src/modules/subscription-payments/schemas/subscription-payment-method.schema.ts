import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionPaymentMethodDocument = SubscriptionPaymentMethod & Document;

export enum PaymentGateway {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  GOOGLE_PAY = 'google_pay',
  APPLE_PAY = 'apple_pay',
  BKASH = 'bkash',
  NAGAD = 'nagad',
  ROCKET = 'rocket',
  UPAY = 'upay',
  MANUAL = 'manual', // For super admin manual activation
}

export enum PaymentMethodType {
  CARD = 'card',
  DIGITAL_WALLET = 'digital_wallet',
  MOBILE_WALLET = 'mobile_wallet',
  BANK_TRANSFER = 'bank_transfer',
  MANUAL = 'manual',
}

@Schema({ timestamps: true })
export class SubscriptionPaymentMethod {
  @Prop({ required: true, enum: PaymentGateway })
  gateway: PaymentGateway;

  @Prop({ required: true, enum: PaymentMethodType })
  type: PaymentMethodType;

  @Prop({ required: true })
  name: string; // e.g., "PayPal", "bKash", "Google Pay"

  @Prop({ required: true, unique: true })
  code: string; // e.g., "paypal", "bkash", "google_pay"

  @Prop()
  displayName?: string;

  @Prop()
  description?: string;

  @Prop()
  icon?: string; // Icon URL or name

  @Prop()
  logo?: string; // Logo URL

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDefault: boolean; // Mark as default payment method (e.g., Stripe)

  @Prop({ type: [String], default: [] })
  supportedCountries: string[]; // ISO country codes, empty = worldwide

  @Prop({ type: [String], default: [] })
  supportedCurrencies: string[]; // ISO currency codes, empty = all

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ type: Object })
  config?: {
    // Gateway-specific configuration
    apiKey?: string;
    secretKey?: string;
    merchantId?: string;
    accountNumber?: string;
    webhookUrl?: string;
    [key: string]: any;
  };

  @Prop({ type: Object })
  metadata?: {
    // Additional metadata
    minAmount?: number;
    maxAmount?: number;
    processingFee?: number;
    processingFeeType?: 'fixed' | 'percentage';
    [key: string]: any;
  };
}

export const SubscriptionPaymentMethodSchema = SchemaFactory.createForClass(SubscriptionPaymentMethod);

