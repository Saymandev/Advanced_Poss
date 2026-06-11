import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BillingCycle, SubscriptionPlan } from '../schemas/subscription.schema';

export class UpgradeSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  newPlan: string;

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;
}

