import {
  IsArray,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Schema as MongooseSchema } from 'mongoose';
import { BillingCycle, SubscriptionPlan } from '../schemas/subscription.schema';

export class CreateSubscriptionDto {
  @IsMongoId()
  @IsNotEmpty()
  companyId: MongooseSchema.Types.ObjectId;

  // Plan-based subscription (legacy) - optional if enabledFeatures is provided
  @IsEnum(SubscriptionPlan)
  @IsOptional()
  plan?: SubscriptionPlan;

  // Feature-based subscription (new flexible model)
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enabledFeatures?: string[]; // Array of feature keys

  @IsEnum(BillingCycle)
  @IsNotEmpty()
  billingCycle: BillingCycle;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;
}

