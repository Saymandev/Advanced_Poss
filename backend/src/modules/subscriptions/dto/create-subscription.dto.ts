import {
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

  @IsEnum(SubscriptionPlan)
  @IsNotEmpty()
  plan: SubscriptionPlan;

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

